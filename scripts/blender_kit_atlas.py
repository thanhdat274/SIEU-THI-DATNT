# Nâng cấp kit prop qua Blender (bpy): nướng atlas màu từ vertex color + nén Draco.
# Đường three.js thuần (scripts/build-kit-assets.ts) không làm được 2 bước này —
# đây là phần "béo" của pipeline Xóm Nông Trại: 1 atlas/kit, GLB nén nhỏ gọn.
#
# Chạy: blender --background --factory-startup --python scripts/blender_kit_atlas.py
# Đầu vào: public/models/kit/<module>.glb  →  Đầu ra: public/models/kit-baked/<module>.glb (+ preview PNG)
import bpy, glob, math, os, sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'models', 'kit')
DST = os.path.join(ROOT, 'public', 'models', 'kit-baked')
PREV = os.path.join(ROOT, 'dev', 'kit-previews')
ATLAS = 512
# --no-bake: bỏ qua nướng atlas, giữ màu đỉnh nguyên trạng (nhỏ hơn cho prop màu phẳng);
# bake atlas chỉ thắng khi prop có vân/texture vẽ tay kiểu kit của Xóm Nông Trại.
NO_BAKE = '--no-bake' in sys.argv
os.makedirs(DST, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

modules = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(SRC, '*.glb')))
if not modules:
    sys.exit(f'Không thấy GLB nào trong {SRC}')

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']

def bake_atlas(meshes, name):
    # Gộp mọi mesh thành một, xé UV bằng Smart UV Project rồi nướng màu đỉnh ra atlas.
    # Bake EMIT (kinh điển cho màu đỉnh, chạy được headless): VertexColor → Emission.
    # DIFFUSE/COLOR bake của Blender 5.2 trả về đen trong thiết lập này nên không dùng.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in meshes:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
    bpy.ops.object.mode_set(mode='OBJECT')

    img = bpy.data.images.new(f'{name}_atlas', ATLAS, ATLAS)
    mat = bpy.data.materials.new(f'{name}_mat')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    # Node VERTEX_COLOR (đúng cái importer glTF của Blender dùng) mới đọc được attribute
    # màu CORNER khi nướng Cycles — ShaderNodeAttribute thường trả về đen.
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    nt.links.new(vc.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    nt.nodes.active = tex
    ob.data.materials.clear()
    ob.data.materials.append(mat)

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    # Blender 3.x có use_margin; 5.x bỏ flag — chỉ còn margin (0 = tắt margin)
    if hasattr(scene.render.bake, 'use_margin'):
        scene.render.bake.use_margin = True
    scene.render.bake.margin = 8
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='EMIT')

    # Nướng xong: trả vật liệu về PBR chuẩn với atlas làm màu gốc (tháo Emission)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    for l in list(nt.links):
        if l.from_node == em and l.to_node == out:
            nt.links.remove(l)
    return ob, img

def export_glb(ob, img, out_path):
    # Ánh xạ atlas xuống UV (nếu có), lưu ảnh vào file (PACK) rồi xuất Draco
    if img:
        img.pack()
    bpy.ops.export_scene.gltf(
        filepath=out_path, export_format='GLB', use_selection=True,
        export_image_format='AUTO', export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )

def render_preview(ob, name):
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    r = max(ob.dimensions) * 1.9 + 0.4
    cam.location = (r * 0.9, -r * 0.9, r * 0.75)
    # Quay camera nhìn vào tâm khối
    center = sum((ob.matrix_world @ v.co for v in ob.data.vertices), Vector()) / len(ob.data.vertices)
    d = center - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 50
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3
    sun = bpy.data.objects.new('sun', sun_data)
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    scene = bpy.context.scene
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'TEXTURE'
    scene.render.resolution_x = scene.render.resolution_y = 384
    scene.render.filepath = os.path.join(PREV, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)

summary = []
for name in modules:
    src = os.path.join(SRC, f'{name}.glb')
    dst = os.path.join(DST, f'{name}.glb')
    reset_scene()
    try:
        meshes = import_glb(src)
        if NO_BAKE:
            bpy.ops.object.select_all(action='DESELECT')
            for ob in meshes:
                ob.select_set(True)
            bpy.context.view_layer.objects.active = meshes[0]
            img = None
        else:
            ob, img = bake_atlas(meshes, name)
        render_preview(bpy.context.view_layer.objects.active, name)
        export_glb(bpy.context.view_layer.objects.active, img, dst)
        kb = os.path.getsize(dst) / 1024
        tris = len(bpy.context.view_layer.objects.active.data.polygons)
        summary.append(f'  {name}: {tris} tris, {kb:.1f}KB (gốc {os.path.getsize(src)//1024}KB)')
        print(f'[kit] {name} OK — {tris} tris, {kb:.1f}KB', flush=True)
    except Exception as e:
        print(f'[kit] {name} LỖI: {e}', flush=True)
        summary.append(f'  {name}: LỖI {e}')

print('[kit] === Tổng kết ===')
print('\n'.join(summary))
