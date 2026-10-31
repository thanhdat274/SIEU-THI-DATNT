# Đèn báo "khách đang đợi" trước hiên tiệm (gđ180) — tài sản 3D dựng thủ công bằng Blender.
# Một quả đèn lồng nhỏ treo sát tường cạnh cửa; lõi phát sáng ấm để code bật khi có khách đang
# đợi ở quầy (`waiting > 0`, do sim sẵn có — không thêm mô phỏng). Xuất GLB nén Draco + manifest.
#
# Chạy: blender --background --factory-startup --python scripts/blender_waitlamp.py
# Đầu ra: public/models/facade/den_cho.glb + cập nhật facade-manifest.json
import bpy, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'public', 'models', 'facade')
os.makedirs(DST, exist_ok=True)
OUT = os.path.join(DST, 'den_cho.glb')

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def M(name, color, rough=0.85, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
    return mat

def EMP(name, color, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
    bsdf.inputs['Emission Strength'].default_value = strength
    return mat

def box(name, size, loc, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

def cyl(name, radius, depth, loc, mat=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

def sph(name, radius, loc, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=14, ring_count=10)
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

# ---- Bảng màu hệ thống thiết kế (bảng ấm, cùng bảng với đèn lồng/biển GĐ177/179) ----
WOOD = (0.42, 0.30, 0.18)
METAL= (0.27, 0.35, 0.40)
GLASS= (1.0, 0.82, 0.55)
GLOW = (1.0, 0.72, 0.30)   # vàng ấm "có khách đang đợi"

def build():
    reset_scene()
    wood_mat  = M('wood', WOOD)
    metal_mat = M('metal', METAL, rough=0.4)
    glass_mat = M('glass', GLASS, alpha=0.5, rough=0.3)
    glow_mat  = EMP('glow', GLOW, strength=0.0)

    # Tay đỡ gắn tường (z=0 là mặt tường tiệm), vươn ra 0.44 m
    box('arm', (0.09, 0.06, 0.44), (0, 1.52, 0.22), wood_mat)
    cyl('postHang', 0.02, 0.06, (0, 1.46, 0.44), metal_mat)
    cyl('topRing', 0.055, 0.05, (0, 1.42, 0.44), metal_mat)
    # Quả đèn: thuỷ tinh cam ấm + lõi phát sáng bên trong (nút 'cho_doi_glow')
    sph('glass', 0.17, (0, 1.28, 0.44), glass_mat)
    sph('glow', 0.105, (0, 1.28, 0.44), glow_mat)
    cyl('bottomCap', 0.03, 0.06, (0, 1.1, 0.44), metal_mat)

    glow_ob = bpy.data.objects['glow']
    glow_ob.name = 'cho_doi_glow'

    bpy.ops.object.select_all(action='DESELECT')
    glue = []
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob.name != 'cho_doi_glow':
            ob.select_set(True)
            glue.append(ob)
    bpy.context.view_layer.objects.active = glue[0]
    bpy.ops.object.join()
    main_ob = bpy.context.active_object
    main_ob.name = 'den_cho_body'
    main_ob.select_set(False)

    bpy.ops.object.select_all(action='DESELECT')
    main_ob.select_set(True)
    glow_ob.select_set(True)
    bpy.context.view_layer.objects.active = glow_ob
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    bpy.ops.object.select_all(action='DESELECT')
    main_ob.select_set(True)
    glow_ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_apply=True,
    )
    return main_ob, glow_ob

if __name__ == '__main__':
    main_ob, glow_ob = build()
    print(f'OK den_cho -> {OUT} ({main_ob.name} + {glow_ob.name})')
