#version 330

#if !defined(IS_GUI) && !defined(IS_SEE_THROUGH)
#moj_import <minecraft:fog.glsl>
#endif

#moj_import <minecraft:dynamictransforms.glsl>

#ifdef IS_GUI
#moj_import <color_util.glsl>
#moj_import <texture_sampling.glsl>
#moj_import <text_shadow.glsl>
#moj_import <ravengard_config.glsl>
#moj_import <minecraft:globals.glsl>
#endif

uniform sampler2D Sampler0;

#if !defined(IS_GUI) && !defined(IS_SEE_THROUGH)
in float sphericalVertexDistance;
in float cylindricalVertexDistance;
#endif

in vec4 vertexColor;
in vec2 texCoord0;

#ifdef IS_GUI
#define IN_OUT in
#moj_import <ravengard_text_io.glsl>
#endif

out vec4 fragColor;

#ifdef IS_GUI
#moj_import <ravengard_text_frag.glsl>
#endif

void main() {
#ifdef IS_GUI
    // GUI text: full custom Ravengard shading (shadows, minimap, spells, cooldowns, etc.)
    fragColor = shadeText();
#else
    // World / see-through text: vanilla
#ifdef IS_GRAYSCALE
    vec4 texColor = texture(Sampler0, texCoord0).rrrr;
#else
    vec4 texColor = texture(Sampler0, texCoord0);
#endif

#ifdef IS_SEE_THROUGH
    vec4 color = texColor * vertexColor;
#else
    vec4 color = texColor * vertexColor * ColorModulator;
#endif
    if (color.a < 0.1) {
        discard;
    }

#ifdef IS_SEE_THROUGH
    fragColor = color * ColorModulator;
#else
    fragColor = apply_fog(color, sphericalVertexDistance, cylindricalVertexDistance, FogEnvironmentalStart, FogEnvironmentalEnd, FogRenderDistanceStart, FogRenderDistanceEnd, FogColor);
#endif
#endif
}
