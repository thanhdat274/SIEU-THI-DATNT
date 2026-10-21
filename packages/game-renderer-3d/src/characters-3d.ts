import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF/index.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { GameSimulation } from '@game/core';
import { NeighborhoodLife, weekdayOf, hashSeed } from '@game/core';
import { detailForZoom, NEIGHBORHOOD_QUALITY } from '@game/data';
import { resolveWeatherQuality } from '@game/renderer-core';
import { TILE_SIZE, type Vector2D } from '@game/shared';
import {
  CHARACTER_CATALOG,
  CHARACTER_MODELS,
  TARGET_CHARACTER_HEIGHT,
  characterModelForDelivery,
  characterModelForId,
  characterModelForPartner,
  characterModelForPlayer,
  shouldHaveNonLa,
  stepYawTowards,
  targetYawFromMovement,
  type CharacterModelKind,
} from './character-models';
import { SCALE_TARGETS } from './scale-spec';
import { pixelToWorld } from './coords';
import type { RoofInfo } from './map-builder';
import { hiddenByRoof } from './crowd-3d';
import { shouldOpenUmbrella } from './umbrellas-3d';
import { CARGO_BOX_COLORS } from './logistics-3d';
import type { LightTint } from './actor-light';

export interface PartnerAvatarInfo {
  position: Vector2D;
  direction: string;
  isMoving?: boolean;
  name?: string;
}

export interface CrowdTalkBubble {
  id: string;
  x: number;
  y: number;
  text: string;
  scale: number;
  bubbleAge: number;
}

interface CharacterInstance {
  id: string;
  kind: CharacterModelKind;
  root: TransformNode;
  renderMeshes: Mesh[];
  idleAnim: AnimationGroup | null;
  walkAnim: AnimationGroup | null;
  currentAnim: 'idle' | 'walk' | null;
  currentYaw: number;
  targetYaw: number;
  prevX: number;
  prevZ: number;
  nonLaMesh: Mesh | null;
  umbrellaMesh: Mesh | null;
  cargoBoxMesh: Mesh | null;
  seenFrame: number;
}

export class Characters3D {
  private readonly containers = new Map<CharacterModelKind, AssetContainer>();
  private readonly instances = new Map<string, CharacterInstance>();
  private readonly pool = new Map<CharacterModelKind, CharacterInstance[]>();
  private isLoaded = false;
  private loadFailed = false;
  private frameId = 0;
  private readonly life: NeighborhoodLife;
  private talkBubbles: CrowdTalkBubble[] = [];
  private devBubble: { text: string; age: number } | null = null;
  private partnerShown: { x: number; y: number } | null = null;
  private prevPartnerPos: { x: number; y: number } | null = null;
  private nonLaMaterial: StandardMaterial | null = null;
  private readonly umbrellaMaterials = new Map<string, StandardMaterial>();
  private readonly boxMaterials = new Map<string, StandardMaterial>();
  private allFeet: Array<{ x: number; z: number }> = [];

  constructor(
    private readonly scene: Scene,
    private readonly simulation: GameSimulation,
  ) {
    this.life = new NeighborhoodLife(hashSeed(String(simulation.getWeatherSeed())));
    void this.loadAllModels();
  }

  public get isReady(): boolean {
    return this.isLoaded && !this.loadFailed;
  }

  public get hasFailed(): boolean {
    return this.loadFailed;
  }

  public get activeCount(): number {
    return this.instances.size;
  }

  public getTalkBubbles(): readonly CrowdTalkBubble[] {
    return this.talkBubbles;
  }

  public getActiveFeet(): ReadonlyArray<{ x: number; z: number }> {
    return this.allFeet;
  }

  public setOpenedWaves(openedWaves: readonly string[]): void {
    this.life.setOpenedWaves(openedWaves);
  }

  public triggerDevBubble(text: string, durationSec = 8): void {
    this.devBubble = { text, age: durationSec };
  }

  private async loadAllModels(): Promise<void> {
    try {
      const kinds = [...CHARACTER_MODELS];
      const loadPromises = kinds.map(async (kind) => {
        const spec = CHARACTER_CATALOG[kind];
        const lastSlash = spec.url.lastIndexOf('/');
        const rootUrl = lastSlash !== -1 ? spec.url.slice(0, lastSlash + 1) : '';
        const filename = lastSlash !== -1 ? spec.url.slice(lastSlash + 1) : spec.url;

        const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, filename, this.scene);
        if (this.scene.isDisposed) {
          container.dispose();
          return null;
        }

        // Cấu hình vật liệu pixel crisp
        for (const mat of container.materials) {
          if (mat instanceof StandardMaterial) {
            mat.specularColor = Color3.Black();
            if (mat.diffuseTexture instanceof Texture) {
              mat.diffuseTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
            }
          } else if (mat instanceof PBRMaterial) {
            mat.metallic = 0;
            mat.roughness = 1;
            if (mat.albedoTexture instanceof Texture) {
              mat.albedoTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
            }
          }
        }

        return { kind, container };
      });

      const results = await Promise.all(loadPromises);
      for (const res of results) {
        if (res) {
          this.containers.set(res.kind, res.container);
        }
      }

      this.isLoaded = this.containers.size > 0;
    } catch (err) {
      console.warn('[Characters3D] Không thể tải model 3D nhân vật, giữ fallback sprite:', err);
      this.loadFailed = true;
    }
  }

  private getNonLaMat(): StandardMaterial {
    if (!this.nonLaMaterial) {
      const mat = new StandardMaterial('non_la_mat', this.scene);
      mat.diffuseColor = Color3.FromHexString('#e8d8a7');
      mat.specularColor = Color3.Black();
      mat.ambientColor = Color3.FromHexString('#8c7a4b');
      this.nonLaMaterial = mat;
    }
    return this.nonLaMaterial;
  }

  private getUmbrellaMat(colorHex: string): StandardMaterial {
    let mat = this.umbrellaMaterials.get(colorHex);
    if (!mat) {
      mat = new StandardMaterial(`umb_mat_${colorHex}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(colorHex);
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      this.umbrellaMaterials.set(colorHex, mat);
    }
    return mat;
  }

  private getBoxMat(type: string): StandardMaterial {
    let mat = this.boxMaterials.get(type);
    if (!mat) {
      const colorHex = CARGO_BOX_COLORS[type] ?? CARGO_BOX_COLORS.carton;
      mat = new StandardMaterial(`cargo_box_mat_${type}`, this.scene);
      mat.diffuseColor = Color3.FromHexString(colorHex);
      mat.specularColor = Color3.Black();
      this.boxMaterials.set(type, mat);
    }
    return mat;
  }

  private createInstance(kind: CharacterModelKind, id: string): CharacterInstance | null {
    const container = this.containers.get(kind);
    if (!container) return null;

    const instantiated = container.instantiateModelsToScene((name) => `${id}_${name}`);
    const root = instantiated.rootNodes[0] as TransformNode;
    const spec = CHARACTER_CATALOG[kind];
    root.scaling.set(spec.scale, spec.scale, spec.scale);

    const renderMeshes: Mesh[] = [];
    for (const node of root.getChildren(undefined, false)) {
      if ((node as Mesh).geometry) {
        const m = node as Mesh;
        m.isPickable = false;
        m.receiveShadows = true;
        renderMeshes.push(m);
      }
    }

    const idleAnim = instantiated.animationGroups.find((ag) => ag.name.includes('idle')) ?? null;
    const walkAnim = instantiated.animationGroups.find((ag) => ag.name.includes('walk')) ?? null;

    // Nón lá
    const nonLa = CreateCylinder(
      `non_la_${id}`,
      {
        height: SCALE_TARGETS.accessories.nonLaHeight,
        diameterTop: 0.02,
        diameterBottom: SCALE_TARGETS.accessories.nonLaDiameter,
        tessellation: 16,
      },
      this.scene,
    );
    nonLa.material = this.getNonLaMat();
    nonLa.parent = root;
    nonLa.position.set(0, TARGET_CHARACTER_HEIGHT / spec.scale - 0.02, 0);
    nonLa.rotation.x = 0.08;
    nonLa.isPickable = false;
    nonLa.setEnabled(false);

    // Ô che mưa
    const umbrella = CreateDisc(
      `umb_${id}`,
      { radius: SCALE_TARGETS.accessories.umbrellaRadius, tessellation: 16 },
      this.scene,
    );
    umbrella.rotation.x = Math.PI / 2;
    umbrella.parent = root;
    umbrella.position.set(0, TARGET_CHARACTER_HEIGHT / spec.scale + 0.14, 0);
    umbrella.isPickable = false;
    umbrella.setEnabled(false);

    // Thùng hàng giao nhận (kích thước thùng tỉ lệ theo người)
    const cargoBox = CreateBox(
      `cargo_box_${id}`,
      { width: 0.28, height: 0.22, depth: 0.28 },
      this.scene,
    );
    cargoBox.parent = root;
    cargoBox.position.set(0, 0.58 / spec.scale, 0.24 / spec.scale);
    cargoBox.isPickable = false;
    cargoBox.setEnabled(false);

    return {
      id,
      kind,
      root,
      renderMeshes,
      idleAnim,
      walkAnim,
      currentAnim: null,
      currentYaw: 0,
      targetYaw: 0,
      prevX: 0,
      prevZ: 0,
      nonLaMesh: nonLa,
      umbrellaMesh: umbrella,
      cargoBoxMesh: cargoBox,
      seenFrame: this.frameId,
    };
  }

  private acquireInstance(kind: CharacterModelKind, id: string): CharacterInstance | null {
    let poolList = this.pool.get(kind);
    if (!poolList) {
      poolList = [];
      this.pool.set(kind, poolList);
    }

    let inst = poolList.pop();
    if (!inst) {
      inst = this.createInstance(kind, id) ?? undefined;
    }
    if (inst) {
      inst.id = id;
      inst.seenFrame = this.frameId;
      inst.root.setEnabled(true);
      this.instances.set(id, inst);
      return inst;
    }
    return null;
  }

  private updatePerson(
    id: string,
    kind: CharacterModelKind,
    worldX: number,
    worldZ: number,
    isMoving: boolean,
    elevation: number,
    elapsed: number,
    roofs: readonly RoofInfo[],
    accessory?: string,
    lookSeed?: number,
    hasUmbrella = false,
    umbrellaColor = '#3b82f6',
    carryingBoxType: string | null = null,
  ): void {
    let inst = this.instances.get(id);
    if (!inst) {
      inst = this.acquireInstance(kind, id) ?? undefined;
      if (!inst) return;
      inst.prevX = worldX;
      inst.prevZ = worldZ;
      inst.root.position.set(worldX, elevation, worldZ);
    }
    inst.seenFrame = this.frameId;

    // Ẩn nếu ở trong tòa nhà có mái che chưa bóc
    const isHidden = hiddenByRoof(worldX, worldZ, roofs);
    if (isHidden) {
      inst.root.setEnabled(false);
      inst.idleAnim?.stop();
      inst.walkAnim?.stop();
      inst.currentAnim = null;
      return;
    }
    inst.root.setEnabled(true);

    // Tính độ dời và xoay mượt theo atan2
    const dx = worldX - inst.prevX;
    const dz = worldZ - inst.prevZ;
    const moving = isMoving || dx * dx + dz * dz > 0.0001;

    inst.targetYaw = targetYawFromMovement(dx, dz, inst.currentYaw);
    inst.currentYaw = stepYawTowards(inst.currentYaw, inst.targetYaw, elapsed);
    inst.root.rotation.y = inst.currentYaw;
    inst.root.position.set(worldX, elevation, worldZ);
    inst.prevX = worldX;
    inst.prevZ = worldZ;

    // Hoạt ảnh
    if (moving) {
      if (inst.currentAnim !== 'walk') {
        inst.idleAnim?.stop();
        inst.walkAnim?.play(true);
        inst.currentAnim = 'walk';
      }
    } else {
      if (inst.currentAnim !== 'idle') {
        inst.walkAnim?.stop();
        inst.idleAnim?.play(true);
        inst.currentAnim = 'idle';
      }
    }

    // Nón lá
    if (inst.nonLaMesh) {
      const withHat = shouldHaveNonLa(id, accessory, lookSeed);
      inst.nonLaMesh.setEnabled(withHat);
    }

    // Ô che mưa
    if (inst.umbrellaMesh) {
      if (hasUmbrella) {
        inst.umbrellaMesh.material = this.getUmbrellaMat(umbrellaColor);
        inst.umbrellaMesh.setEnabled(true);
      } else {
        inst.umbrellaMesh.setEnabled(false);
      }
    }

    // Thùng hàng giao nhận
    if (inst.cargoBoxMesh) {
      if (carryingBoxType) {
        inst.cargoBoxMesh.material = this.getBoxMat(carryingBoxType);
        inst.cargoBoxMesh.setEnabled(true);
      } else {
        inst.cargoBoxMesh.setEnabled(false);
      }
    }

    this.allFeet.push({ x: worldX, z: worldZ });
  }

  public update(
    elapsed: number,
    playerRenderPixel: [number, number],
    playerMoving: boolean,
    roofs: readonly RoofInfo[],
    partnerAvatar: PartnerAvatarInfo | null | undefined,
    cameraFocus: { centerX: number; centerZ: number; radius: number } | undefined,
    currentRain: number,
    currentDay: number,
  ): void {
    if (!this.isReady) return;

    this.frameId++;
    this.allFeet = [];
    this.talkBubbles = [];
    const worldTime = this.simulation.getTime();

    // 1. NGƯỜI CHƠI (Cô Năm - character_female_a)
    const pWorld = pixelToWorld(playerRenderPixel[0], playerRenderPixel[1]);
    this.updatePerson(
      'player',
      characterModelForPlayer(),
      pWorld.x,
      pWorld.z,
      playerMoving,
      0,
      elapsed,
      roofs,
    );

    // 2. BẠN CO-OP (character_male_a)
    if (partnerAvatar) {
      if (!this.partnerShown) {
        this.partnerShown = { x: partnerAvatar.position.x, y: partnerAvatar.position.y };
      }
      const blend = Math.min(1, elapsed * 10);
      this.partnerShown.x += (partnerAvatar.position.x - this.partnerShown.x) * blend;
      this.partnerShown.y += (partnerAvatar.position.y - this.partnerShown.y) * blend;
      const partWorld = pixelToWorld(this.partnerShown.x, this.partnerShown.y);
      const isPartMoving =
        partnerAvatar.isMoving ||
        (this.prevPartnerPos
          ? Math.hypot(this.partnerShown.x - this.prevPartnerPos.x, this.partnerShown.y - this.prevPartnerPos.y) > 0.5
          : false);
      this.prevPartnerPos = { x: this.partnerShown.x, y: this.partnerShown.y };

      this.updatePerson(
        'partner',
        characterModelForPartner(),
        partWorld.x,
        partWorld.z,
        isPartMoving,
        0,
        elapsed,
        roofs,
      );
    }

    // 3. KHÁCH HÀNG TRONG TIỆM & ĐỢI THANH TOÁN
    const customers = this.simulation.peekCustomers();
    for (let idx = 0; idx < customers.length; idx++) {
      const c = customers[idx];
      const id = "c:" + (c.id ?? c.checkoutId ?? idx);
      const cWorld = pixelToWorld(c.position.x, c.position.y);
      const kind = characterModelForId(id, c.lookSeed ?? idx);
      const { open: hasUmbrella, color: umbColor } = shouldOpenUmbrella(
        currentRain,
        c.id ?? String(idx),
        currentDay,
        cWorld.x,
        cWorld.z,
        roofs,
      );

      this.updatePerson(
        id,
        kind,
        cWorld.x,
        cWorld.z,
        false,
        0,
        elapsed,
        roofs,
        undefined,
        c.lookSeed ?? idx,
        hasUmbrella,
        umbColor,
      );
    }

    // 4. NHÂN VIÊN TRONG CA
    const workers = this.simulation.peekVisibleStaff();
    for (let idx = 0; idx < workers.length; idx++) {
      const w = workers[idx];
      const p = w.position ?? { x: 300 + idx * TILE_SIZE, y: 300 };
      const id = "s:" + w.id;
      const sWorld = pixelToWorld(p.x, p.y);
      const kind = characterModelForId(id, idx + 3);

      this.updatePerson(
        id,
        kind,
        sWorld.x,
        sWorld.z,
        false,
        0,
        elapsed,
        roofs,
        undefined,
        idx + 3,
      );
    }

    // 5. NHÂN VIÊN GIAO NHẬN (LOGISTICS WORKER)
    const logEv = this.simulation.getLogisticsState().activeEvent;
    if (logEv?.worker && (logEv.phase === "unloading" || logEv.phase === "loading")) {
      const w = logEv.worker;
      const wWorld = pixelToWorld(w.x, w.y);
      const id = "logistics_worker";
      const carryingBox = w.carryingBox ? w.boxType : null;

      this.updatePerson(
        id,
        characterModelForDelivery(),
        wWorld.x,
        wWorld.z,
        true,
        0,
        elapsed,
        roofs,
        undefined,
        6,
        false,
        "",
        carryingBox,
      );
    }

    // 6. CƯ DÂN KHU PHỐ & NGƯỜI ĐI BỘ (NEIGHBORHOOD LIFE)
    const r = (cameraFocus?.radius ?? 20) * TILE_SIZE;
    const cx = (cameraFocus?.centerX ?? pWorld.x) * TILE_SIZE;
    const cy = (cameraFocus?.centerZ ?? pWorld.z) * TILE_SIZE;
    const detail = detailForZoom(2);
    const vehicles = this.simulation.getStreetVehicles();

    this.life.update(
      elapsed,
      {
        hour: worldTime.hour,
        minute: worldTime.minute,
        day: worldTime.day,
        weekday: weekdayOf(worldTime.day),
        rain: currentRain,
        weatherId: this.simulation.getEffectiveWeatherId(),
        vehicles,
        civicPopulation: this.simulation.getCivicPopulation(),
        mobile: false,
      },
      { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r },
      detail,
      resolveWeatherQuality(),
    );
    this.simulation.setStreetCrossings(this.life.getCrossings());

    // Người đi bộ qua đường (vạch trước tiệm)
    for (const ped of this.simulation.getStreetPedestrians()) {
      if (ped.position.x < cx - r - 64 || ped.position.x > cx + r + 64 || ped.position.y < cy - r - 64 || ped.position.y > cy + r + 64) continue;
      const id = "sp:" + ped.id;
      const pedWorld = pixelToWorld(ped.position.x, ped.position.y);
      const kind = characterModelForId(id, ped.variant);
      const { open: hasUmbrella, color: umbColor } = shouldOpenUmbrella(
        currentRain,
        id,
        currentDay,
        pedWorld.x,
        pedWorld.z,
        roofs,
      );
      this.updatePerson(
        id,
        kind,
        pedWorld.x,
        pedWorld.z,
        ped.state === "walking",
        0,
        elapsed,
        roofs,
        undefined,
        ped.variant,
        hasUmbrella,
        umbColor,
      );
    }

    const maxBubbles = NEIGHBORHOOD_QUALITY[resolveWeatherQuality()].bubbles;
    let bubbleIndex = 0;
    this.life.forEachVisible((n) => {
      if (n.x < cx - r - 64 || n.x > cx + r + 64 || n.y < cy - r - 64 || n.y > cy + r + 64) return;
      const id = "n:" + n.id;
      const nWorld = pixelToWorld(n.x, n.y);
      const kind = characterModelForId(id, n.spriteVariant);
      const { open: hasUmbrella, color: umbColor } = shouldOpenUmbrella(
        currentRain,
        n.id,
        currentDay,
        nWorld.x,
        nWorld.z,
        roofs,
      );

      this.updatePerson(
        id,
        kind,
        nWorld.x,
        nWorld.z,
        n.pose === "walking",
        0,
        elapsed,
        roofs,
        n.accessory,
        n.spriteVariant,
        hasUmbrella,
        umbColor,
      );

      if (n.bubble && bubbleIndex < maxBubbles) {
        bubbleIndex++;
        this.talkBubbles.push({
          id: n.id,
          x: n.x,
          y: n.y,
          text: n.bubble,
          scale: n.scale,
          bubbleAge: n.bubbleAge,
        });
      }
    });

    // Dev bubble
    if (this.devBubble) {
      this.devBubble.age -= elapsed;
      this.talkBubbles.push({
        id: 'dev_bubble',
        x: pWorld.x,
        y: pWorld.z - 0.2,
        text: this.devBubble.text,
        scale: 1,
        bubbleAge: 0.1,
      });
      if (this.devBubble.age <= 0) {
        this.devBubble = null;
      }
    }

    // DỌN SẠCH CÁC INSTANCE KHÔNG CÒN XUẤT HIỆN Ở KHUNG NÀY
    for (const [id, inst] of this.instances) {
      if (inst.seenFrame !== this.frameId) {
        inst.root.setEnabled(false);
        inst.idleAnim?.stop();
        inst.walkAnim?.stop();
        inst.currentAnim = null;
        this.instances.delete(id);
        const pList = this.pool.get(inst.kind);
        if (pList) pList.push(inst);
      }
    }
  }

  public setLightTint(t: LightTint): void {
    // Với model 3D PBR/Standard, ánh sáng ban ngày/đêm/mưa tự động được tính
    // bởi Sky3D DirectionalLight + HemisphericLight.
    // Nếu cần chỉnh sâu hơn, có thể điều chỉnh ambientColor của vật liệu nón lá.
    if (this.nonLaMaterial) {
      this.nonLaMaterial.ambientColor.set(t.r * 0.4, t.g * 0.4, t.b * 0.4);
    }
  }

  public dispose(): void {
    for (const inst of this.instances.values()) {
      inst.root.dispose(false, true);
    }
    this.instances.clear();

    for (const poolList of this.pool.values()) {
      for (const inst of poolList) {
        inst.root.dispose(false, true);
      }
    }
    this.pool.clear();

    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();
  }
}
