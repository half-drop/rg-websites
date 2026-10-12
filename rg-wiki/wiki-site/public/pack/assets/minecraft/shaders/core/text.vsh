#version 330
#extension GL_ARB_shader_draw_parameters : enable

#if !defined(IS_GUI) && !defined(IS_SEE_THROUGH)
#moj_import <minecraft:fog.glsl>
#moj_import <minecraft:sample_lightmap.glsl>
#endif

#moj_import <minecraft:dynamictransforms.glsl>
#moj_import <minecraft:projection.glsl>

#ifdef IS_GUI
#moj_import <minecraft:globals.glsl>
#endif

uniform sampler2D Sampler0;

in vec3 Position;
in vec4 Color;
in vec2 UV0;

#if !defined(IS_GUI) && !defined(IS_SEE_THROUGH)
uniform sampler2D Sampler2;
in ivec2 UV2;
out float sphericalVertexDistance;
out float cylindricalVertexDistance;
#endif

out vec4 vertexColor;
out vec2 texCoord0;

#ifdef IS_GUI
    #if defined(VULKAN) || !defined(GL_ARB_shader_draw_parameters)
        // Works because text UVs are inset by 0.01 pixels, so the fractional part of the UVs is
        //    always 0.01 or 0.99 depending on the corner. This only works for text shaders
        // 
        // Required when gl_BaseVertexARB is unavailable since gl_VertexID is not
        //    guaranteed to start at 0 for each draw call.
        vec2 cornerFractOffset = fract(UV0 * 256.0);
        int isBottomVertex = int(cornerFractOffset.y > 0.5);
        int isRightVertex = int(cornerFractOffset.x > 0.5);
        #define CORNER_ID ((isRightVertex ^ isBottomVertex) + isRightVertex * 2)
    #endif

    #moj_import <color_util.glsl>
    #moj_import <ui_helpers.glsl>
    #moj_import <text_shadow.glsl>
    #moj_import <ravengard_config.glsl>

    #define IN_OUT out
    #moj_import <ravengard_text_io.glsl>
    #moj_import <ravengard_text.glsl>
#endif

void main() {
#ifdef IS_GUI
    // Initialize default values
    pos = Position;
    int cornerID = CORNER_ID;
    corner = corners[cornerID];
    vertexColor = Color;
    texCoord0 = UV0;
    spellPixelCoord = ivec3(-1);
    dataID = DATA_ID_DEFAULT;
    cropCoords = vec4(-100000);
    cutoutCoords = vec4(-100000);
    direction = vec2(0);
    sampleScale = -1.0;
    sampleBounds = vec4(0.0);

    // Send character bounding box data to fragment shader, using Z to undo interpolation from other vertices
    uvTopLeft = cornerID == 0 ? vec3(UV0.xy, 1.0) : vec3(0.0);
    uvBottomRight = cornerID == 2 ? vec3(UV0.xy, 1.0) : vec3(0.0);

    ravengardText();

    gl_Position = ProjMat * ModelViewMat * vec4(pos, 1.0);
#else
    // === Vanilla world / see-through text using unmodified Position ===
    gl_Position = ProjMat * ModelViewMat * vec4(Position, 1.0);

#if !defined(IS_SEE_THROUGH)
    sphericalVertexDistance = fog_spherical_distance(Position);
    cylindricalVertexDistance = fog_cylindrical_distance(Position);
    vertexColor = Color * sample_lightmap(Sampler2, UV2);
#else
    vertexColor = Color;
#endif
    texCoord0 = UV0;
#endif
}
