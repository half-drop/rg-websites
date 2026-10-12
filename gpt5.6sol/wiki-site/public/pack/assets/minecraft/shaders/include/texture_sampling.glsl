// === Texture sampling ===
// Improved bilinear interpolated texture fetch from Inigo Quilez
vec4 sampleBilinear(sampler2D sam, vec2 texelPos) {
    vec2 st = texelPos - 0.5;
    ivec2 i = ivec2(floor(st));
    vec2  w = fract(st);

    vec4 a = texelFetch(sam, i + ivec2(0, 0), 0);
    vec4 b = texelFetch(sam, i + ivec2(1, 0), 0);
    vec4 c = texelFetch(sam, i + ivec2(0, 1), 0);
    vec4 d = texelFetch(sam, i + ivec2(1, 1), 0);

    return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

// Improved pixel-art upscaling. Biases sampling towards the center of
// each texel to make the upscaled image look less blurry.
// Adapted from Cole Cecil's "Scaling Pixel Art Without Destroying It"
vec4 sampleSharpPixelArt(
    sampler2D sam,
    vec2 uvCoord,         // Coordinates in UV space (0-1)
    vec2 texSize,         // textureSize(Sampler0, 0) in pixels
    vec2 minSampleCoord,  // Min coordinate of the samplable region in texels
    vec2 maxSampleCoord,  // Max coordinate of the samplable region in texels
    float scale)          // On-screen pixels per texel
{
    // Convert UV coordinates to texel space
    vec2 texelCoord = uvCoord * texSize;

    vec2 subTexel = fract(texelCoord);
    vec2 smoothSubTexel = clamp(subTexel * scale, 0.0, 0.5)
                        + clamp((subTexel - 1.0) * scale + 0.5, 0.0, 0.5);
    vec2 sampleTexel = floor(texelCoord) + smoothSubTexel;

    // Don't sample outside the bounds of the samplable area
    sampleTexel = clamp(sampleTexel, minSampleCoord + 0.5, maxSampleCoord - 0.5);

    return sampleBilinear(sam, sampleTexel);
}