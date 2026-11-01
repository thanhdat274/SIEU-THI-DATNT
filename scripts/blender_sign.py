# Biển treo "mở/đóng cửa" trước cửa tiệm (gđ179) — tài sản 3D dựng thủ công bằng Blender.
# Cột gỗ nhỏ + biển gỗ treo bằng hai móc, mặt trước có tấm trạng thái phát sáng:
# code bật/tắt theo shopOpen — xanh = mở, đỏ/dìm = đóng. Xuất GLB nén Draco + manifest kiểm kê.
#
# Chạy: blender --background --factory-startup --python scripts/blender_sign.py
# Đầu ra: public/models/facade/bien_mo_cua.glb + cập nhật facade-manifest.json
import bpy, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'public', 'models', 'facade')
os.makedirs(DST, exist_ok=True)
OUT = os.path.join(DST, 'bien_mo_cua.glb')

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def M(name, color, rough=0.85):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
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

# ---- Bảng màu hệ thống thiết kế (bảng ấm, cùng bảng với đèn lồng) ----
WOOD = (0.42, 0.30, 0.18)   # gỗ sậm
METAL= (0.27, 0.35, 0.40)   # kim loại móc
STATE= (1.0, 1.0, 1.0)      # tấm trạng thái: code đổi emissive theo shopOpen (trắng nền)

def build():
    reset_scene()
    wood_mat  = M('wood', WOOD)
    metal_mat = M('metal', METAL, rough=0.4)
    state_mat = EMP('state', STATE, strength=0.0)

    # Cột gỗ (chôn nhẹ xuống đất), móc treo + biển gỗ phía trên
    cyl('post', 0.05, 2.6, (0, 0, 1.3), wood_mat)
    cyl('postCap', 0.09, 0.12, (0, 0, 2.62), wood_mat)
    # Hai móc treo kim loại dọc từ đỉnh cột xuống hai đầu biển
    cyl('hookL', 0.013, 0.5, (-0.27, 0, 2.36), metal_mat)
    cyl('hookR', 0.013, 0.5, ( 0.27, 0, 2.36), metal_mat)
    # Biển gỗ treo giữa hai móc (mặt trước hướng +z = ra phía lòng đường)
    box('board', (0.66, 0.12, 0.12), (0, 0, 2.02), wood_mat)
    # Tấm trạng thái phát sáng nổi lên mặt trước biển
    box('state', (0.50, 0.04, 0.28), (0, 0.09, 2.06), state_mat)

    # Đánh dấu phần trạng thái để code đổi màu/độ sáng theo shopOpen
    state_ob = bpy.data.objects['state']
    state_ob.name = 'bien_mo_cua_state'

    # Gộp phần không phát sáng thành 1 mesh (đỡ draw call); giữ tấm trạng thái riêng
    bpy.ops.object.select_all(action='DESELECT')
    glue = []
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob.name != 'bien_mo_cua_state':
            ob.select_set(True)
            glue.append(ob)
    bpy.context.view_layer.objects.active = glue[0]
    bpy.ops.object.join()
    main_ob = bpy.context.active_object
    main_ob.name = 'bien_mo_cua_body'
    main_ob.select_set(False)

    bpy.ops.object.select_all(action='DESELECT')
    main_ob.select_set(True)
    state_ob.select_set(True)
    bpy.context.view_layer.objects.active = state_ob
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    bpy.ops.object.select_all(action='DESELECT')
    main_ob.select_set(True)
    state_ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_apply=True,
    )
    return main_ob, state_ob

if __name__ == '__main__':
    main_ob, state_ob = build()
    print(f'OK bien_mo_cua -> {OUT} ({main_ob.name} + {state_ob.name})')
