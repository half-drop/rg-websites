#version 330

#moj_import <color_util.glsl>
#moj_import <shared_data_ids.glsl>

#moj_import <minecraft:fog.glsl>
#moj_import <minecraft:dynamictransforms.glsl>

uniform sampler2D Sampler0;

in float sphericalVertexDistance;
in float cylindricalVertexDistance;
in vec4 vertexColor;
in vec4 lightMapColor;
in vec4 overlayColor;
in vec2 texCoord0;

out vec4 fragColor;

#define IN_OUT in
#moj_import <ravengard_item_io.glsl>

void main() {
    vec4 sampledColor = texture(Sampler0, texCoord0);
    vec4 color = sampledColor;

    // Overlay data pixels must always be written, so exempt them from the vanilla alpha cutout.
#ifdef ALPHA_CUTOUT
    if (isOverlay != 1 && color.a < ALPHA_CUTOUT) {
        discard;
    }
#endif

    color *= vertexColor * ColorModulator;
    color.rgb = mix(overlayColor.rgb, color.rgb, overlayColor.a);
    color *= lightMapColor;

    // Emissive textures
    if (shouldApplyEmissives(sampledColor.a)) {
        color = vec4(sampledColor.rgb, 1.0);
    }

    // 50% Opaque Emissive textures
    if (shouldApplyHalfOpaqueEmissives(sampledColor.a)) {
        color = vec4(sampledColor.rgb, 0.5);
    }

    if (isOverlay == 1)
    {
        // RGB is multiplied by alpha channel then truncated, so Alpha must be 1.0 to preserve precision
        // data1.rgb = marker
        // data2.rg = texture offset
        // data3.rg = texture size

        // Write the important data to the output texture
        if(ivec2(gl_FragCoord.xy) == ivec2(0, 0)) {

            // Data 1 - Marker
            fragColor.rgb = vec3(0xFE, 0xFD, 0x02) / 255.0; // Marker to indicate this is an overlay texture
            fragColor.a = 1.0;
            return;
        } else if(ivec2(gl_FragCoord.xy) == ivec2(1, 0)) {

            // Data 2 - Texture offset
            fragColor.rgb = dyeColor.rgb;
            fragColor.a = 1.0;
            return;

        } else if(ivec2(gl_FragCoord.xy) == ivec2(0, 1)) {

            // Data 3 - Texture size

            // Calculate texture size
            // Undo interpolation to get top left and bottom right UVs
            vec2 uv00 = uvTopLeft.xy / uvTopLeft.z;
            vec2 uv11 = uvBottomRight.xy / uvBottomRight.z;

            // Calculate exact texture size in pixels
            vec2 uvSizeInPixels = (uv11 - uv00) * textureSize(Sampler0, 0);

            // Store data
            fragColor.rg = uvSizeInPixels / 255.0; // Calculated texture size
            fragColor.b = 0.0;
            fragColor.a = 1.0;
            return;
        }

        color = sampledColor;
    }

    fragColor = apply_fog(color, sphericalVertexDistance, cylindricalVertexDistance, FogEnvironmentalStart, FogEnvironmentalEnd, FogRenderDistanceStart, FogRenderDistanceEnd, FogColor);
}
