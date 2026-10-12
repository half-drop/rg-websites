// =============================================================================
// Cross-version Ravengard text fragment logic (rendertype_text)
//
// The importing shader MUST declare the following before importing this file:
//   - uniforms: Sampler0, GameTime
//   - inputs:   pos, corner, vertexColor, texCoord0, spellPixelCoord, cropCoords,
//               cutoutCoords, direction, sampleScale, sampleBounds,
//               uvTopLeft, uvBottomRight, dataID
//   - the custom includes this logic depends on: color_util, texture_sampling,
//                                                 text_shadow, config
// and must handle fog and fragColor itself.
// =============================================================================

const float PI = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;

float easeOutCubic(float x) {
    return 1.0 - pow(1.0 - x, 3.0);
}

// Animated pulsing circle around the player icon, drawn where the icon is transparent.
void handlePlayerIcon(inout vec4 color) {
    float distFromCenter = length(corner);

    const float pulseSpeed = 24000.0 / float(PLAYER_BLIP_TICKS_PER_PULSE);
    float progress = fract(GameTime * pulseSpeed);
    progress = easeOutCubic(progress);

    if(distFromCenter > progress - PLAYER_BLIP_CIRCLE_THICKNESS && distFromCenter < progress) {
        color = vec4(1.0);
        color.a = 1.0 - smoothstep(0.75, 1.0, progress);
    }
}

// Radial progress overlay for spell / status effect cooldowns.
void handleSpellProgress(inout vec4 color, vec4 sampledColor) {
    // Remove tint
    color = sampledColor;

    // Floor the pixel coordinates so each GUI pixel has the same value
    vec2 spellCoord = floor(spellPixelCoord.xy);

    // Radial progress bar. vertexColor.b contains the progress value
    float angle = atan((spellCoord.y), (spellCoord.x)) + PI;
    float cutoffAngle = vertexColor.b * PI * 2;
    if(angle > cutoffAngle) {
        color.rgb = mix(color.rgb, SPELL_COOLDOWN_COLOR.rgb, SPELL_COOLDOWN_COLOR.a); // Apply the progress overlay if this pixel's angle is beyond the current progress
    }
}

// Minimap guide line - marching ants animation.
void handleGuideLine(inout vec4 color) {
    color = vec4(1.0);

    const float cycleLength = GUIDE_LINE_SEGMENT_LENGTH + GUIDE_LINE_GAP_LENGTH;
    float progress = mod(dot(pos.xy, direction) - (GameTime * GUIDE_LINE_MARCH_SPEED), cycleLength);

    if(progress < GUIDE_LINE_GAP_LENGTH) {
        discard;
    }
}

// Crop the fragment to a rectangle (used to crop the minimap).
void handleCrop() {
    // Outside the crop area
    if(pos.x < cropCoords.x || pos.y < cropCoords.y || pos.x > cropCoords.z || pos.y > cropCoords.w) {
        discard;
    }
}

// Cut a hole in the fragment, optionally drawing the deathwall border/fill around it.
void handleCutout(inout vec4 color) {
    float borderThickness = DEATHWALL_BORDER_THICKNESS * vertexColor.r; // Adjust border thickness based on GUI scale, sent from vertex shader

    // Inside the cutout area
    if(pos.x > cutoutCoords.x && pos.y > cutoutCoords.y && pos.x < cutoutCoords.z && pos.y < cutoutCoords.w) {
        discard;
    } else if (dataID == DATA_ID_MAP_DEATHWALL) {
        // Apply deathwall colors
        if (pos.x > cutoutCoords.x - borderThickness &&
            pos.y > cutoutCoords.y - borderThickness &&
            pos.x < cutoutCoords.z + borderThickness &&
            pos.y < cutoutCoords.w + borderThickness) {
            // Deathwall border
            color = DEATHWALL_BORDER_COLOR;
        } else {
            // Deathwall
            color = DEATHWALL_COLOR;
        }
    }
}

// Computes the final (pre-fog) fragment color, applying every text effect in order.
vec4 shadeText() {
    vec2 texCoord = texCoord0;

    // Undo interpolation to accurately get the glyph's corner UVs
    vec2 uv00 = uvTopLeft.xy / uvTopLeft.z;
    vec2 uv11 = uvBottomRight.xy / uvBottomRight.z;

    vec4 sampledColor = sampleScale > 0.0
        ? sampleSharpPixelArt(Sampler0, texCoord0, vec2(textureSize(Sampler0, 0)), sampleBounds.xy, sampleBounds.zw, sampleScale)
        : texture(Sampler0, texCoord);
    vec4 color = sampledColor * vertexColor;

    // Player icon
    if (dataID == DATA_ID_PLAYER_ICON && color.a < 0.1) {
        handlePlayerIcon(color);
    }

    // If the texture coordinate is invalid, use the vertex color
    if (texCoord0.x < -4096.0) {
        color = vertexColor;
    } else {
        if (dataID == DATA_ID_TEXT_SHADOW) {
            color = applyTextShadow(Sampler0, texCoord0, uv00, uv11, sampledColor, vertexColor, vec4(COLOR_TEXT_SHADOW.rgb, COLOR_TEXT_SHADOW.a * vertexColor.a));
        }

        // Discard transparent pixels
        if (color.a < 0.1) {
            discard;
        }
    }

    // Spell progress
    if(int(spellPixelCoord.z) == 1) {
        handleSpellProgress(color, sampledColor);
    }

    // Minimap guide line
    if(dataID == DATA_ID_MAP_GUIDE_LINE) {
        handleGuideLine(color);
    }

    // Crop image if cropCoords is set (used to crop the minimap)
    if (cropCoords.x > -10000) {
        handleCrop();
    }

    // Cut out a hole if cutoutCoords is set
    if (cutoutCoords.x > -10000) {
        handleCutout(color);
    }

    return color;
}
