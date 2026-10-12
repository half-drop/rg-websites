// =============================================================================
// Cross-version Ravengard UI shader logic (position_tex_color)
//
// The importing shader MUST declare the following before importing this file:
//   - uniforms: Sampler0, ProjMat, ModelViewMat
//   - inputs:   Position, UV0, Color
//   - globals:  pos, texCoord0, vertexColor
//   - the custom includes this logic depends on: color_util, ui_helpers, config
// and must handle gl_Position itself.
// =============================================================================

// Shared per-vertex values, computed once in ravengardUI() and passed to each handler.
struct UiContext {
    int  cornerID;
    vec2 corner;
    vec2 corner0to1;
    int  cornerColorID;
    int  topLeftCornerColorID;
    vec2 guiSize;
    vec2 guiCenter;
    vec2 atlasSize;
};

// Overrides the corner on devices that don't support gl_BaseVertexARB
// Only works on input textures that are not in an atlas.
//
// Luckily, any UI quads that are drawn from an atlas are unsorted and thus
// can safely trust gl_VertexID without gl_BaseVertexARB
void overrideCornerID(inout UiContext context, bool flipY) {
#if defined(VULKAN) || !defined(GL_ARB_shader_draw_parameters)
    int isBottomVertex = int((UV0.y > 0.0) != flipY);
    int isRightVertex = int(UV0.x > 0.0);
    context.cornerID = ((isRightVertex ^ isBottomVertex) + isRightVertex * 2);
    context.corner = corners[context.cornerID];
    context.corner0to1 = corners0to1[context.cornerID];
#endif
}

// === Turn hearts into health bar ===
void handleHealthBar(UiContext context) {
    ivec2 bottomCenter = ivec2(context.guiSize * vec2(0.5, 1.0));

    ivec2 delta = ivec2(Position.xy) - (bottomCenter + VANILLA_HEART_ORIGIN);

    // Shift the delta to be the same for all vertices
    delta -= ivec2(context.corner0to1) * VANILLA_HEART_SIZE;

    // === Calculate heartID ===
    // Hearts are 8px apart, so divide by 8 to get horizontal heartID.
    int heartID = delta.x / 8;
    int row = (-delta.y + 1) / HEALTHBAR_ROW_HEIGHT; // +1 to account for low-health shaking
    heartID += row * 10; // Update heartID based on row

    // === Position hearts into a bar using the data ===
    const int healthBarHalfWidth = HEALTH_BAR_WIDTH / 2;
    int barStart = bottomCenter.x - healthBarHalfWidth;

    // Position horizontally
    pos.x = barStart + ((heartID + context.corner0to1.x) * HEALTH_SEGMENT_WIDTH);

    // Position vertically
    pos.y += row * HEALTHBAR_ROW_HEIGHT + (HEALTH_BAR_DIST_FROM_BOTTOM + 39); // Use relative position to preserve shaking and regeneration
    pos.y += ((HEALTH_BAR_HEIGHT + 2) - VANILLA_HEART_SIZE.y) * context.corner0to1.y; // Shift bottom to the correct height

    // Make each heart sample a different part of the health bar texture
    float pixelOffset = float(heartID * HEALTH_SEGMENT_WIDTH);
    if(context.corner.x > 0.0) { // Right-side vertices
        pixelOffset -= HEALTH_BAR_WIDTH; // Shift back to the left-side of the bar
        pixelOffset += HEALTH_SEGMENT_WIDTH; // Move to the right edge of the heart
    }
    texCoord0.x += pixelOffset / context.atlasSize.x;

    pos = shrinkToContent(pos, context.corner);
    texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);
}

// === Turn exp bar into stamina bar ===
void handleStaminaBar(UiContext context) {
    pos = shrinkToContent(pos, context.corner);
    texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);

    const int heightDiff = (STAMINA_BAR_HEIGHT + 2) - 5; // 5 is vanilla exp bar height
    const int offset = STAMINA_BAR_DIST_FROM_BOTTOM + 24; // 24 is vanilla exp bar offset
    pos.y += heightDiff * context.corner0to1.y; // Shift bottom vertices down
    pos.y += offset; // Move the whole bar up
}

// === Menu Buttons and Overlays ===
void handleMenuOverlay(UiContext context) {
    overrideCornerID(context, true);

    // Unpack data pixels from item_entity_translucent_cull
    // Read texture offset pixel
    vec2 data2 = texelFetch(Sampler0, ivec2(1, 0), 0).rg;
    vec2 offset = (data2 * 255.0) - vec2(128.0);

    // Texture size
    vec2 data3 = texelFetch(Sampler0, ivec2(0, 1), 0).rg;
    vec2 texSize = data3 * 255.0;
    texCoord0.y += context.corner.y / texSize.y; // Strip top and bottom rows of pixels from the output UV
    texSize.y -= 2; // Remove the data pixel rows from the texture size

    pos.xy = calculateUIPlacement(
        vec2(0, 0),
        vec2(-1, -1),
        texSize,
        context.guiSize,
        context.corner);

    pos.y += 1; // Account for top row of data pixels
    pos.xy += offset; // Move by defined offset
}

// === Bossbar and Spellcast Bars ===
void handleBossbars(UiContext context) {
    const float widestBossBar = SMALLEST_BOSSBAR + (BOSSBAR_STEP * (BOSSBAR_TEXTURE_COUNT - 1));

    // Calculate percent filled
    // This works for the background too, since percentFilled is 0 for the left and 1 for the right
    float leftEdge = context.guiCenter.x - (VANILLA_BOSSBAR_SIZE.x / 2);
    float percentFilled = (Position.x - leftEdge) / VANILLA_BOSSBAR_SIZE.x;
    percentFilled -= 0.5; // -0.5 to 0.5 so the bar is centered

    pos.x = context.guiCenter.x;

    // Calculate the widest possible texture
    int bossbarTextureID = getBossbarTextureID(context.guiSize.x);
    float bossbarWidth = getBossbarWidth(bossbarTextureID);

    // Dynamic boss bar sizing
    if(context.cornerColorID == UI_CORNER_ID_BOSSBAR_BG || context.cornerColorID == UI_CORNER_ID_BOSSBAR_PROGRESS) {
        // Move bottom vertex UVs to the bottom of the first bossbar
        float bossbarUVHeight = BOSSBAR_HEIGHT / context.atlasSize.y;
        texCoord0.y -= (BOSSBAR_TEXTURE_COUNT - 1) * bossbarUVHeight * context.corner0to1.y;

        // Move bossbar UV down to the correct texture
        texCoord0.y += bossbarTextureID * bossbarUVHeight;

        // Set the UV.x to the size of the chosen texture
        texCoord0.x += (bossbarWidth - widestBossBar) * percentFilled / context.atlasSize.x;
    }

    // Assign the size and top bar position
    vec2 size;
    float top;
    switch(context.cornerColorID) {

        case UI_CORNER_ID_BOSSBAR_BG: // Bossbar Background
        case UI_CORNER_ID_BOSSBAR_PROGRESS: // Bossbar Progress
            size = vec2(bossbarWidth, BOSSBAR_HEIGHT);
            break;

        case UI_CORNER_ID_BOSS_CAST_BG: // Boss Spellcast Bar Background
        case UI_CORNER_ID_BOSS_CAST_PROGRESS: // Boss Spellcast Bar Progress
        case UI_CORNER_ID_CAST_BAR_BG: // Cast Bar Background
        case UI_CORNER_ID_CAST_BAR_PROGRESS: // Cast Bar Progress
            size = CAST_BAR_SIZE;
            break;
    }

    switch(context.cornerColorID) {
        case UI_CORNER_ID_BOSSBAR_BG: // Bossbar Background
        case UI_CORNER_ID_BOSSBAR_PROGRESS: // Bossbar Progress
            top = BOSSBAR_TOP;
            break;

        case UI_CORNER_ID_BOSS_CAST_BG: // Boss Spellcast Bar Background
        case UI_CORNER_ID_BOSS_CAST_PROGRESS: // Boss Spellcast Bar Progress
            top = BOSS_CAST_TOP;
            break;

        case UI_CORNER_ID_CAST_BAR_BG: // Cast Bar Background
        case UI_CORNER_ID_CAST_BAR_PROGRESS: // Cast Bar Progress
            top = context.guiCenter.y + CAST_BAR_TOP;
            break;
    }

    pos.x += (int(size.x) % 2) * 0.5; // Re-align to pixel grid if the width is an odd number
    pos.x += size.x * percentFilled;
    pos.y = top + size.y * context.corner0to1.y;

    pos.y += 8; // Shift down 8px to make room for the RAVENGARD decoration

    pos = shrinkToContent(pos, context.corner);
    texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);
}

// === Expand generic_54 UV ===
void handleGeneric54(UiContext context) {
    overrideCornerID(context, false);

    // Change UV.x to use the whole texture width
    texCoord0.x = context.corner0to1.x;

    // Only center the X coordinate, since generic_54 has special vertical UV mapping for different chest sizes
    pos.x = calculateUIPlacement(
        vec2(0, 0),
        vec2(0, 0),
        context.atlasSize,
        context.guiSize,
        context.corner).x;

    ivec2 texelCoords = ivec2(UV0 * context.atlasSize);

    bool isBottomVertex = texelCoords.y == VANILLA_GENERIC_54_SIZE.y;

    // Expand UV downwards to add extra space for the skull decoration
    if(isBottomVertex) {
        pos.y += 15;
        texCoord0.y += 15 / context.atlasSize.y;
    }

    // Only hide the data pixels for the very top and bottom corners, not the middle vertices
    if (texelCoords.y == 0 || isBottomVertex) {
        pos = shrinkToContent(pos, context.corner);
        texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);
    }
}

// === Center vanilla inventory UV ===
void handleInventory(UiContext context) {
    overrideCornerID(context, false);

    // Change UV coordinates to use the whole texture
    texCoord0 = context.corner0to1;

    pos.xy = calculateUIPlacement(
        vec2(0, 0),
        vec2(0, 0),
        vec2(256, 256),
        context.guiSize,
        context.corner);
    pos.y -= 18;

    pos = shrinkToContent(pos, context.corner);
    texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);
}

// === Expand the hotbar texture ===
void handleHotbar(UiContext context) {
    pos = shrinkToContent(pos, context.corner);
    texCoord0 = cropDataRows(texCoord0, context.corner, context.atlasSize);

    pos.xy = calculateUIPlacement(
        vec2(0, 1),    // Origin
        vec2(0, 1),    // Anchor
        HOTBAR_SIZE,
        context.guiSize
    );
}

void ravengardUI() {
    int cornerID = CORNER_ID;
    vec2 corner = corners[cornerID];
    vec2 corner0to1 = corners0to1[cornerID];
    vec4 cornerColor = getCornerColor(Sampler0, UV0); // Color of this corner in the texture
    int cornerColorID = getColorID(cornerColor.rgb);
    int topLeftCornerColorID = getColorID(texture(Sampler0, vec2(0.0)).rgb); // Used by menu overlay, generic_54 & inventory
    vec2 guiSize = getGUISize(ProjMat);
    vec2 guiCenter = floor(guiSize * 0.5);
    vec2 atlasSize = textureSize(Sampler0, 0);

    UiContext context = UiContext(
        cornerID, corner, corner0to1, cornerColorID, topLeftCornerColorID, guiSize, guiCenter, atlasSize);

    // === Turn hearts into health bar ===
    if(cornerColorID == UI_CORNER_ID_HEALTH_BAR) {
        handleHealthBar(context);
    }

    // === Turn exp bar into stamina bar ===
    else if(cornerColorID == UI_CORNER_ID_STAMINA_BAR) {
        handleStaminaBar(context);
    }

    // === Menu Buttons and Overlays ===
    else if(topLeftCornerColorID == UI_CORNER_ID_MENU_OVERLAY) {
        handleMenuOverlay(context);
    }

    // === Bossbar and Spellcast Bars ===
    else if(cornerColorID >= UI_CORNER_ID_BOSSBAR_BG && cornerColorID <= UI_CORNER_ID_CAST_BAR_PROGRESS) {
        handleBossbars(context);
    }

    // === Expand generic_54 UV ===
    else if(topLeftCornerColorID == UI_CORNER_ID_GENERIC_54) {
        handleGeneric54(context);
    }

    // === Center vanilla inventory UV ===
    else if(topLeftCornerColorID == UI_CORNER_ID_INVENTORY) {
        handleInventory(context);
    }

    // === Expand the hotbar texture ===
    else if(cornerColorID == UI_CORNER_ID_HOTBAR) {
        handleHotbar(context);
    }
}
