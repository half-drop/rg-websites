#version 330
#extension GL_ARB_shader_draw_parameters : enable

#moj_import <ui_helpers.glsl>
#moj_import <color_util.glsl>
#moj_import <ravengard_config.glsl>

// === Uniforms ===
#moj_import <minecraft:dynamictransforms.glsl>
#moj_import <minecraft:projection.glsl>
#moj_import <minecraft:globals.glsl>
uniform sampler2D Sampler0;

in vec3 Position;
in vec2 UV0;
in vec4 Color;

out vec2 texCoord0;
out vec4 vertexColor;

// Vertex outputs the handlers populate
vec3 pos;

#moj_import <ravengard_ui.glsl>

void main() {

    pos = Position;
    texCoord0 = UV0;
    vertexColor = Color;

    if(ProjMat[3].x == -1) { // isGUI
        ravengardUI();
    }

    gl_Position = ProjMat * ModelViewMat * vec4(pos, 1.0);
}