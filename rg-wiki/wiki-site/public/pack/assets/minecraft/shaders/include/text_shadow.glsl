// Grow the quad 1px right and down to make room for the shadow
void expandForShadow(inout vec3 pos, inout vec2 texCoord0, vec2 corner0to1, vec2 atlasSize) {
    pos.xy += corner0to1;
    texCoord0 += corner0to1 / atlasSize;
}

// Applies a vanilla-style text shadow.
vec4 applyTextShadow(sampler2D sam, vec2 texCoord, vec2 minUV, vec2 maxUV, vec4 sampledColor, vec4 tint, vec4 shadowColor) {
    vec2 atlasSize = vec2(textureSize(sam, 0));
    ivec2 currentTexel = ivec2(floor(texCoord * atlasSize)); // fragment sits inside a texel
    ivec2 glyphMin = ivec2(round(minUV * atlasSize));        // first glyph texel
    ivec2 glyphMax = ivec2(round(maxUV * atlasSize)) - 1;    // last glyph texel (maxUV is the far edge)

    // Solid glyph pixel: draw the tinted text, but don't draw anything outside of the original glyph range
    bool insideGlyph = all(greaterThanEqual(currentTexel, glyphMin)) && all(lessThanEqual(currentTexel, glyphMax));
    if (insideGlyph && sampledColor.a > 0.1) {
        return sampledColor * tint;
    }

    // Otherwise cast a shadow from the glyph one texel up-left. If that texel falls outside this
    // glyph there is no shadow, which also stops us sampling a neighbouring glyph from the atlas.
    ivec2 shadowTexel = currentTexel - 1;
    bool shadowInGlyph = all(greaterThanEqual(shadowTexel, glyphMin)) && all(lessThanEqual(shadowTexel, glyphMax));
    float shadowMask = shadowInGlyph ? texelFetch(sam, shadowTexel, 0).a : 0.0;
    return vec4(shadowColor.rgb, shadowColor.a * shadowMask);
}