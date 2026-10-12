// =============================================================================
// Cross-version Ravengard text shader logic
//
// The importing shader MUST declare the following before importing this file:
//   - uniforms: Sampler0, Sampler2, ProjMat, ModelViewMat, ScreenSize, GameTime
//   - inputs:   Position, Color, UV0, UV2
//   - custom outputs: pos, corner, vertexColor, texCoord0, spellPixelCoord,
//                     cropCoords, cutoutCoords, direction, sampleScale,
//                     sampleBounds, dataID
//   - the custom includes this logic depends on: color_util, ui_helpers, config
// and must handle fog and gl_Position itself.
// =============================================================================

vec4 getMinimapCanvasArea(vec2 guiSize) {

    // Calculate minimap canvas area (topLeft.x, topLeft.y, bottomRight.x, bottomRight.y)
    float left   = guiSize.x - (MINIMAP_MARGIN.x + MINIMAP_BACKGROUND_SIZE.x - MINIMAP_BORDER.x);
    float top    = MINIMAP_MARGIN.y + MINIMAP_BORDER.y;
    float right  = guiSize.x - (MINIMAP_MARGIN.x + MINIMAP_BORDER.x);
    float bottom = MINIMAP_MARGIN.y + MINIMAP_BACKGROUND_SIZE.y - MINIMAP_BORDER.y;
    return vec4(left, top, right, bottom);
}

// Shared per-vertex values, computed once in ravengardText() and passed to each handler.
struct GuiContext {
    int   cornerID;
    int   cornerColorID;
    int   tintColorID;
    vec2  guiSize;
    vec2  guiCenter;
    vec2  atlasSize;
    float guiScale;
    vec2  playerWorldPos;
    float fullMapScaleRatio;
    vec2  guiCenterFromScoreboard;
    float guiTopFromScoreboard;
    float guiRightFromScoreboard;
    float guiBottomFromScoreboard;
};

void handleMenuBackground(GuiContext context) {
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);

    pos.xy = calculateUIPlacement(
        vec2(0, 0),
        vec2(0, 0),
        vec2(256, 254),
        context.guiSize);
    pos.y -= 31;

    vertexColor = vec4(1);
}

void handleMinimapBackground(GuiContext context) {
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);

    pos.xy = calculateUIPlacement(
        vec2(1, -1), // Origin
        vec2(1, -1), // Anchor
        MINIMAP_BACKGROUND_SIZE, // Size
        context.guiSize);

    // Shift minimap background based on margin
    pos.xy += MINIMAP_MARGIN * vec2(-1, 1);
}

void handleHoverEffect(GuiContext context) {
    // Read texture size from the second set of data pixels
    vec2 hoverSize = getCornerColor(Sampler0, texCoord0, 1).rg * 255 + 1;
    vec2 offset = (vertexColor.rg * 255.0) - vec2(128.0); // Get offset from center in pixels

    pos.xy = calculateUIPlacement(
        vec2(0, 0),
        vec2(-1, -1),
        hoverSize,
        context.guiSize);

    pos.xy += offset;

    // In a recent update, the rendering order of GUI elements now ignores the Z position, so we
    // need this unfortunate hack to make the hover effect disappear behind the tooltip background
    cutoutCoords.xy = Position.xy - vec2(12, 19) + vec2(TOOLTIP_TEXTURE_EDGE_MARGIN);
    cutoutCoords.zw = vec2(9999999);

    vertexColor = vec4(1);

    // Hide data pixels
    pos = shrinkToContent(pos, corner);
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);
}

void handleTeammateHealth(GuiContext context) {
    // Blue channel is 0x00 for left teammate, 0x01 for right teammate
    int leftOrRight = int(Color.b * 255.0);
    leftOrRight = leftOrRight * 2 - 1; // -1.0 for left, 1.0 for right

    // Position textures below the minimap
    pos.xy = calculateUIPlacement(
        vec2(1, -1),
        vec2(-leftOrRight, -1),
        TEAMMATE_HEALTHBAR_SIZE,
        context.guiSize);

    // Center under the minimap
    pos.x += floor(MINIMAP_CENTER.x) - 1;
    pos.y += MINIMAP_MARGIN.y + MINIMAP_BACKGROUND_SIZE.y;

    // Spread the left / right teammate bars apart
    pos.x += leftOrRight * 8;

    // Apply lost health based on the blue channel
    int healthLost = clamp(MAX_TEAMMATE_HEALTH - int(Color.r * 255.0), 0, MAX_TEAMMATE_HEALTH);
    if(corner.x > 0) {
        texCoord0.x -= healthLost / context.atlasSize.x;
        pos.x -= healthLost;
    }

    vertexColor = vec4(1);

    // Hide data pixels
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);
}

void handleTitleAnimation(GuiContext context) {
    // Hide all frames by default
    vertexColor.a = 0.0;

    // Unpack animation data
    // R = Start Frame
    // G = End Frame
    // B = Fade out frames
    ivec3 animationData = ivec3(getCornerColor(Sampler0, texCoord0, 1).rgb * 255.0);
    int startFrame = animationData.r;
    int endFrame = animationData.g;
    int fadeOutFrames = animationData.b;

    // Check which frame we're on based on the opacity from the title command
    // Title command doesn't appear at all until 9/255 opacity, so set 9 opacity as frame 0
    int currentFrame = int(Color.a * 255.0) - 9;

    // Check if this frame should be visible
    if(currentFrame >= startFrame && currentFrame <= endFrame) {

        // Make this frame visible and remove tint
        vertexColor = vec4(1.0);

        // Handle fade out
        vertexColor.a = 1.0 - smoothstep(float(endFrame - fadeOutFrames), float(endFrame), float(currentFrame));
    }

    pos.xy = calculateUIPlacement(
        vec2(0, 0), // Origin
        vec2(0, 0.5), // Anchor
        vec2(256, 256), // Size
        context.guiSize);

    // Drawn at full texture height, so shrink the quad and crop the data rows.
    pos = shrinkToContent(pos, corner);
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);
}

void handleSpellCooldowns(GuiContext context) {
    // Drawn at full texture height, so shrink the quad and crop the data rows.
    pos = shrinkToContent(pos, corner);
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);

    ivec3 colorInt = ivec3(Color * 255.0);

    // Send pixel coord data to be interpolated for the fragment shader
    int cornerIndex = (context.cornerID + 1) % 4; // Rotated so the progress starts at the top
    spellPixelCoord.xy = vec2(corners[cornerIndex] * SPELL_TEXTURE_SIZE * 0.5);
    spellPixelCoord.z = 1; // Tell fragment shader to apply spell cooldown effect

    // Optimization: don't apply cooldown overlay if spell is 100% full
    if(colorInt.b == 0xFF) {
        spellPixelCoord.z = -1;
        vertexColor = vec4(1);
    }

    // Position the spell cooldowns
    if(context.tintColorID >= 0xFEFB00 && context.tintColorID <= 0xFEFCFF) {

        int spellSide = ((context.tintColorID & 0x00FF00) >> 8) - 0xFB; // 0x00FB00 = left, 0x00FC00 = right
        spellSide = (-spellSide * 2) + 1;

        pos.xy = calculateUIPlacement(
            vec2(0, 1), // Origin
            vec2(0, 0), // Anchor
            SPELL_TEXTURE_SIZE,
            context.guiSize);

        pos.xy += SPELL_OFFSET * vec2(spellSide, 1);
    }

    // Status effect cooldowns
    else if((context.tintColorID & 0xFFFF00) == 0xFEFA00) {

        const int maxEffectSlots = 21; // How many display slots there are
        const vec2[] effectLayout = vec2[] ( // Assigns a position to each status effect slot
            vec2(-5, 0), vec2(-3, 0), vec2(-1, 0), vec2(1, 0), vec2(3, 0), vec2(5, 0),
            vec2(-4, -1), vec2(-2, -1), vec2(0, -1), vec2(2, -1), vec2(4, -1),
            vec2(-3, -2), vec2(-1, -2), vec2(1, -2), vec2(3, -2),
            vec2(-2, -3), vec2(0, -3), vec2(2, -3),
            vec2(-1, -4), vec2(1, -4),
            vec2(0, -5)
        );

        // Flip the cooldown effect horizontally
        spellPixelCoord.y *= -1;

        // Unpack which slot this effect is in.
        // This allows the server to just send all the effects in the same line back to back
        int effectSlot = int(Position.x) + 100000; // Adjust for scoreboard being 99999 (+1) pixels wide
        effectSlot -= int(context.guiSize.x); // Get position from right side of the screen

        // Shift vertices to the center to increase tolerance
        effectSlot -= int(corner.x * (SPELL_TEXTURE_SIZE.x * 0.5));
        effectSlot /= int((SPELL_TEXTURE_SIZE.x + 1)); // Integer divide

        // Don't display effect if there are too many
        if(effectSlot / 2 >= maxEffectSlots) {
            pos.xy = vec2(-9999999.0); // Move off-screen to cull this vertex
            return;
        }

        // Don't display cooldown on the outline texture (every other spell texture)
        if(effectSlot % 2 == 1) {
            spellPixelCoord.z = -1;
            vertexColor = vec4(1);
        }

        // Move effects to the correct spot
        pos.xy = calculateUIPlacement(
            vec2(0, 1), // Origin
            vec2(0, 1), // Anchor
            SPELL_TEXTURE_SIZE,
            context.guiSize);

        pos.y += STATUS_EFFECT_BOTTOM;

        pos.xy += effectLayout[(effectSlot / 2)] * (SPELL_TEXTURE_SIZE * 0.5);
    }
}

void handleMinimapIcons(GuiContext context) {
    // Unpack icon position and rotation
    // Color = 0bXXXXXXXX XYYYYYYY YYRRRRRR
    // 9 X bits
    // 9 Y bits
    // 6 Rotation bits
    vec2 iconPos = vec2(context.tintColorID >> 15, (context.tintColorID >> 6) & 0x1ff /* 9 bits */);
    iconPos = (iconPos / 2) - 128;

    float rotation = (context.tintColorID & 0x3F /* 6 bits */) * (PI / 32.0);
    rotation += PI; // Rotate 180 degrees so north is 0 degrees
    mat2x2 rotationMat = mat2x2(cos(rotation),   sin(rotation),
                                -sin(rotation),  cos(rotation));
    vec2 rotatedCorner = rotationMat * corner;

    // Choose correct icon size
    vec2 iconSize;
    switch (context.cornerColorID) {
        case TEXT_CORNER_ID_MAP_ICON: // Standard map icon
            iconSize = MAP_ICON_SIZE;
            break;
        case TEXT_CORNER_ID_MAP_ICON_LARGE: // Large map icon
            iconSize = LARGE_MAP_ICON_SIZE;
            break;
        case TEXT_CORNER_ID_MAP_PLAYER_ICON: // Player icon
            iconSize = PLAYER_ICON_SIZE;
            dataID = DATA_ID_PLAYER_ICON; // Mark player icon
            break;
    }

    // Minimap
    if(pos.x < -50000.0) { // Glyph is in the scoreboard

        dataID = DATA_ID_DEFAULT; // Only mark full map player icon

        // Put the icon in position
        pos.xy = calculateUIPlacement(
            vec2(1, -1), // Origin (Top right of screen)
            vec2(0, 0), // Anchor (Centered)
            iconSize * MINIMAP_ZOOM,
            context.guiSize,
            rotatedCorner);

        // Shift icon to be centered in the minimap area
        pos.xy += MINIMAP_CENTER;

        // Move icon based on where it is relative to the player
        pos.xy += iconPos * MINIMAP_ZOOM;

        cropCoords = getMinimapCanvasArea(context.guiSize);

        sampleScale = MINIMAP_ZOOM * context.guiScale;

    } else { // Fullscreen Map

        // Put the icon in position
        pos.xy = calculateUIPlacement(
            vec2(0, 0),
            vec2(0, 0),
            iconSize * context.fullMapScaleRatio,
            context.guiSize,
            rotatedCorner);

        // Move icon to its position on the map
        pos.xy += iconPos * 2 * context.fullMapScaleRatio;

        sampleScale = context.fullMapScaleRatio * context.guiScale;
    }

    // Hide data pixels
    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);

    vec2 iconMinTexel = (UV0 * context.atlasSize) - ((corner + 1.0) * 0.5) * iconSize;
    sampleBounds = vec4(iconMinTexel + vec2(0.0, 1.0), iconMinTexel + iconSize - vec2(0.0, 1.0));

    vertexColor = vec4(1);
}

void handleDeathwall(GuiContext context) {
    dataID = DATA_ID_MAP_DEATHWALL; // Mark as deathwall

    // Calculate deathwall cutout
    // Unpack deathwall center
    vec2 center = vec2(context.tintColorID >> 12, context.tintColorID & 0x000FFF);
    center = (center / 2.0) - 1024.0;

    bool isMinimap = pos.x < -50000; // Check if glyph is in the scoreboard or in tab

    // Unpack deathwall size
    float size = Position.x;
    size -= (corner.x * 2.0); // The char is 4px wide. Shift 2px toward the center.
    size -= isMinimap ? context.guiSize.x : context.guiCenter.x; // Get position from right side of the screen, or center if this is the full map
    size += isMinimap ? 100000 : 0; // Adjust for scoreboard being 99999 (+1) pixels wide
    size *= isMinimap ? 1 : 2; // Size data is based on space chars, which are half as effective when centered

    float zoom = isMinimap ? MINIMAP_ZOOM : context.fullMapScaleRatio; // Scale size based on whether this is minimap or fullscreen map
    vertexColor.r = isMinimap ? 1.0 : context.fullMapScaleRatio; // Pass scale ratio to prevent fullscreen map deathwall border from changing with GUI scale
    vec2 origin = isMinimap ? vec2(1, -1) : vec2(0, 0); // Center of the map area
    vec2 drawableArea = isMinimap ? MINIMAP_BACKGROUND_SIZE - (MINIMAP_BORDER * 2) : vec2(512) * context.fullMapScaleRatio; // Where the map is drawn

    // Place vertices so the deathwall only renders in the map area
    pos.xy = calculateUIPlacement(
        origin, // Origin
        vec2(0, 0), // Anchor
        drawableArea, // Size
        context.guiSize);

    // Calculate cutout area
    cutoutCoords.xy = calculateUIPlacement(
        origin, // Origin
        vec2(0, 0), // Anchor
        vec2(size) * zoom, // Size
        context.guiSize,
        vec2(-1)); // Top Left Corner

    cutoutCoords.zw = calculateUIPlacement(
        origin, // Origin
        vec2(0, 0), // Anchor
        vec2(size) * zoom, // Size
        context.guiSize,
        vec2(1)); // Bottom Right Corner

    cutoutCoords += ((center * zoom)).xyxy;

    // Shift deathwall to be centered in the minimap area
    if(isMinimap) {
        pos.xy += MINIMAP_CENTER;
        cutoutCoords += MINIMAP_CENTER.xyxy;
    }

    // Deathwall warning
    if(context.cornerColorID == TEXT_CORNER_ID_DEATHWALL_WARNING) {
        dataID = DATA_ID_DEFAULT; // Don't mark warning line as deathwall
        cropCoords = cutoutCoords + (DEATHWALL_WARNING_THICKNESS * vec4(-1, -1, 1, 1) * zoom); // Crop a border around the cutout
        vertexColor = DEATHWALL_WARNING_COLOR;
    };

    texCoord0 = vec2(-10000.0); // Disable texture sampling
}

void handleGuideLine(GuiContext context) {

    if(pos.x < -50000) {

        // Unpack position of the second point
        vec2 offset = vec2(context.tintColorID >> 12, context.tintColorID & 0x000FFF);
        offset = (offset / 2.0) - 1024.0;
        offset *= MINIMAP_ZOOM;

        vec2 point1 = context.guiSize * vec2(1, 0); // Top right of the screen
        vec2 point2 = point1 + offset;

        // Get direction and normal vectors
        direction = normalize(offset);
        vec2 tangent = vec2(-direction.y, direction.x);

        // Left / right side of the line
        vec2 side = mix(point1, point2, corners0to1[context.cornerID].x);

        // Shift vertices based on the line thickness
        vec2 verticalOffset = corner.y * tangent * (GUIDE_LINE_THICKNESS * 0.5 * MINIMAP_ZOOM);

        pos.xy = side + verticalOffset;

        // Shift icon to be centered in the minimap area
        pos.xy += MINIMAP_CENTER;

        // Crop if outside minimap area
        cropCoords = getMinimapCanvasArea(context.guiSize);
    } else {

        // Unpack position
        // Color = 0bXXXXXXXX XYYYYYYY YY000000
        // 9 X bits
        // 9 Y bits
        // 6 Unused bits
        vec2 targetPos = vec2(context.tintColorID >> 15, (context.tintColorID >> 6) & 0x1ff /* 9 bits */);
        targetPos = (targetPos / 2) - 128;

        // Scale to map ratio
        targetPos *= 2 * context.fullMapScaleRatio;

        vec2 playerPos = context.playerWorldPos;

        // Get direction and normal vectors
        vec2 offset = targetPos - playerPos;
        direction = normalize(offset);
        vec2 tangent = vec2(-direction.y, direction.x);
        direction /= context.fullMapScaleRatio; // Adjust direction vector length to keep spacing consistent at different GUI scales

        // Left / right side of the line
        vec2 side = mix(playerPos, targetPos, corners0to1[context.cornerID].x);

        // Shift vertices based on the line thickness
        vec2 verticalOffset = corner.y * tangent * (GUIDE_LINE_THICKNESS * 0.5 * MINIMAP_ZOOM);

        pos.xy = side + verticalOffset;
        pos.xy *= context.fullMapScaleRatio;
        pos.xy += context.guiCenter;
    }

    // Make color white
    dataID = DATA_ID_MAP_GUIDE_LINE; // Mark as guide line
    texCoord0 = vec2(-10000.0); // Disable texture sampling
}

void handleMapSegments(GuiContext context) {
    // Unpack map segment coordinates
    // Each segment's offset is in the format 0xFEFEXY, centered at 8
    // 0xFEFE88 = (0, 0)
    // 0xFEFE78 = (-128, 0)
    // 0xFEFEAA = (256, 254)
    int mapSegmentX = (context.cornerColorID & 0xF0) >> 4;
    int mapSegmentY = (context.cornerColorID & 0x0F);
    vec2 segmentOffset = vec2(
        (mapSegmentX - 8) * ((MINIMAP_SEGMENT_SIZE.x) * 0.5),
        (mapSegmentY - 8) * ((MINIMAP_SEGMENT_SIZE.y - 2) * 0.5)
    );

    bool isMinimap = pos.x < -50000; // Glyph is in the scoreboard
    float zoom = isMinimap ? MINIMAP_ZOOM : context.fullMapScaleRatio;

    // Minimap
    if(isMinimap) {

        // Unpack player position
        vec2 playerPos = vec2(context.tintColorID >> 12, context.tintColorID & 0x000FFF);
        playerPos = (playerPos / 4) - 512;

        // Position minimap texture segments
        pos.xy = calculateUIPlacement(
            vec2(1, -1), // Origin (Top right of screen)
            vec2(0, 0), // Anchor (Centered)
            MINIMAP_SEGMENT_SIZE * MINIMAP_ZOOM,
            context.guiSize);

        // Shift minimap to be centered in the minimap area
        pos.xy += MINIMAP_CENTER;

        // Move segments into position
        pos.xy += segmentOffset * MINIMAP_ZOOM;

        // Move map based on where player is
        pos.xy -= playerPos * MINIMAP_ZOOM;

        cropCoords = getMinimapCanvasArea(context.guiSize);
    } else { // Fullscreen Map

        // Position minimap texture segments
        pos.xy = calculateUIPlacement(
            vec2(0, 0), // Origin (Center of screen)
            vec2(0, 0), // Anchor (Centered)
            MINIMAP_SEGMENT_SIZE * context.fullMapScaleRatio,
            context.guiSize);

        // Move segments into position
        pos.xy += segmentOffset * context.fullMapScaleRatio;

        // Smoothly upscale the fullscreen map, skipping the top/bottom data pixel rows
        sampleScale = context.fullMapScaleRatio * context.guiScale;
        sampleBounds = vec4(0.0, 1.0, context.atlasSize.x, context.atlasSize.y - 1.0);
    }

    // Hide the data pixels manually
    pos.y -= corner.y * zoom;
    texCoord0.y -= corner.y / context.atlasSize.y;
    vertexColor = vec4(1);
}

void handleStaticTextures(GuiContext context) {
    switch(context.cornerColorID) {
        // Arrow ammo display
        case TEXT_CORNER_ID_ARROW_AMMO:
            pos.x = context.guiCenterFromScoreboard.x;
            pos.y = calculateUIPlacement( 
                vec2(0, 0), // Origin (Center of screen)
                vec2(0, 0), // Anchor (Centered)
                ARROW_AMMO_SIZE, // Size
                context.guiSize).y;
            break;

        // Keybind Icons
        case TEXT_CORNER_ID_KEYBIND_ICON: 
            pos.x = context.guiCenterFromScoreboard.x + 1;
            pos.y = calculateUIPlacement(
                vec2(0, 1), // Origin (Bottom center of screen)
                vec2(0, 1), // Anchor (Bottom center)
                KEYBIND_ICON_SIZE, // Size
                context.guiSize).y;
            pos.y -= 16;
            break;

        // Hypixel.net watermark
        case TEXT_CORNER_ID_HYPIXEL_WATERMARK:
            pos.xy = calculateUIPlacement(
                vec2(1, 1), // Origin
                vec2(1, 1), // Anchor
                HYPIXEL_NET_SIZE, // Size
                context.guiSize);

            pos.xy += vec2(-4, -3);
            break;

        // Ravengard Animated Text
        case TEXT_CORNER_ID_RAVENGARD_TEXT:
            // Position text to the size of one frame
            pos.xy = ceil(calculateUIPlacement(
                vec2(0, -1), // Origin
                vec2(0, -1), // Anchor
                RAVENGARD_FRAME_SIZE, // Size
                context.guiSize));

            pos.y += 1;

            float frameHeightInAtlas = RAVENGARD_FRAME_SIZE.y / context.atlasSize.y;
            float textureHeightInAtlas = RAVENGARD_FULL_SIZE.y / context.atlasSize.y;

            // Resize UV to the height of one frame
            texCoord0.y += (frameHeightInAtlas - textureHeightInAtlas) * corners0to1[context.cornerID].y;

            // Determine which frame to show based on GameTime
            int currentFrame = int(GameTime * 18000) % RAVENGARD_FRAME_COUNT; // 1 Frame every 100ms
            int frameID = int(RAVENGARD_FRAME_IDS[currentFrame]);

            texCoord0.y += frameID * frameHeightInAtlas;
            pos = shrinkToContent(pos, corner);
            break;

        // Queue Background
        case TEXT_CORNER_ID_QUEUE_BACKGROUND:
            pos.xy = calculateUIPlacement( 
                vec2(0, -1),
                vec2(0, -1),
                QUEUE_BACKGROUND_SIZE, // Size
                context.guiSize);
            pos.y += 30;
            break;
    }

    texCoord0 = cropDataRows(texCoord0, corner, context.atlasSize);
    vertexColor = vec4(1);
}

void handleTextEffects(GuiContext context) {
    // Positioning
    switch(context.tintColorID) {
        case TEXT_TINT_ID_BOSS_SPELLCAST:
            pos.y += 18;
            break;

        case TEXT_TINT_ID_CAST_BAR:
            pos.y += context.guiCenter.y - 26;
            break;

        case TEXT_TINT_ID_HEALTH_TEXT:
            pos.x = context.guiCenterFromScoreboard.x + 89;
            pos.y = context.guiBottomFromScoreboard - 81;
            break;

        case TEXT_TINT_ID_STAMINA_TEXT:
            pos.x = context.guiCenterFromScoreboard.x + 89;
            pos.y = context.guiBottomFromScoreboard - 68;
            break;

        case TEXT_TINT_ID_WIDGETS_LINE1:
            pos.x += 100000 + floor(MINIMAP_CENTER.x) + 1;
            pos.y += MINIMAP_MARGIN.y + MINIMAP_BACKGROUND_SIZE.y - context.guiCenter.y - 20;
            pos.x = floor(pos.x);
            break;

        case TEXT_TINT_ID_WIDGETS_LINE2:
            pos.x += 100000 + floor(MINIMAP_CENTER.x) + 1;
            pos.y += MINIMAP_MARGIN.y + MINIMAP_BACKGROUND_SIZE.y - context.guiCenter.y - 8;
            pos.x = floor(pos.x);
            break;

        case TEXT_TINT_ID_BOSS_HEALTH:
            pos.x = context.guiCenterFromScoreboard.x + 1 + floor(getBossbarWidth(getBossbarTextureID(context.guiSize.x)) * 0.5);
            pos.y += -context.guiCenter.y - 24;
            break;

        case TEXT_TINT_ID_BOSS_NAME:
            pos.x = context.guiCenterFromScoreboard.x - floor(getBossbarWidth(getBossbarTextureID(context.guiSize.x)) * 0.5);
            pos.y += -context.guiCenter.y - 15;
            break;

        case TEXT_TINT_ID_DATE:
        case TEXT_TINT_ID_SERVER:
            pos.x = context.guiRightFromScoreboard - 2;
            pos.y = context.guiBottomFromScoreboard - 58;
            break;

        case TEXT_TINT_ID_LEVELUP_NUMBER:
        case TEXT_TINT_ID_LEVELUP_TEXT:

            // Hardcoded values from the level up animation
            const int startFrame = 0x28;
            const int endFrame = 0xF6;
            const int fadeOutFrames = 0x14;

            int currentFrame = int(Color.a * 255.0) - 9;

            // Check if this frame should be visible
            if(currentFrame >= startFrame && currentFrame <= endFrame) {

                // Make this frame visible and remove tint
                vertexColor = vec4(1.0);
                
                // Handle fade out
                vertexColor.a = 1.0 - smoothstep(float(endFrame - fadeOutFrames), float(endFrame), float(currentFrame));
            } else {
                vertexColor.a = 0.0; // Hide this frame
            }

            // True if text is part of title, false if subtitle
            bool isMainTitle = context.tintColorID == TEXT_TINT_ID_LEVELUP_NUMBER;

            // Handle scaling / positioning
            pos.xy = (pos.xy + (context.guiCenter * (isMainTitle ? 3.0 : 1.0))) / (isMainTitle ? 4.0 : 2.0); // Scale down to regular size
            pos.y -= isMainTitle ? 35 : 61;
            break;

        case TEXT_TINT_ID_KEYBINDS:
            pos.x += 100000 - context.guiSize.x + context.guiCenter.x -164;
            pos.y += -context.guiCenter.y + context.guiSize.y - 50;
            break;

        case TEXT_TINT_ID_MENU_TITLE:
            pos.x = floor(pos.x);
            pos.x += 1;
            pos.x += 8192 + 79;
            pos.y -= 16;
            break;

        case TEXT_TINT_ID_QUEUE_LINE1:
            pos.x = context.guiCenterFromScoreboard.x;
            pos.y = context.guiTopFromScoreboard + 5;
            break;

        case TEXT_TINT_ID_QUEUE_LINE2:
            pos.x = context.guiCenterFromScoreboard.x;
            pos.y = context.guiTopFromScoreboard + 16;
            break;

        case TEXT_TINT_ID_QUEUE_LINE3:
            pos.x = context.guiCenterFromScoreboard.x;
            pos.y = context.guiTopFromScoreboard + 27;
            break;

    }

    // Colors
    bool hasShadow = true;
    switch(context.tintColorID) {
        case TEXT_TINT_ID_BOSS_SPELLCAST:
        case TEXT_TINT_ID_CAST_BAR:
        case TEXT_TINT_ID_HEALTH_TEXT:
        case TEXT_TINT_ID_STAMINA_TEXT:
        case TEXT_TINT_ID_WIDGETS_LINE1:
        case TEXT_TINT_ID_WIDGETS_LINE2:
        case TEXT_TINT_ID_BOSS_HEALTH:
        case TEXT_TINT_ID_BOSS_NAME:
        case TEXT_TINT_ID_LEVELUP_TEXT:
        case TEXT_TINT_ID_KEYBINDS:
        case TEXT_TINT_ID_QUEUE_LINE1:
            vertexColor.rgb = COLOR_TEXT_WHITE;
            break;

        case TEXT_TINT_ID_LEVELUP_NUMBER:
        case TEXT_TINT_ID_QUEUE_LINE2:
            vertexColor.rgb = COLOR_TEXT_GOLD;
            break;

        case TEXT_TINT_ID_DATE:
        case TEXT_TINT_ID_MENU_TITLE:
        case TEXT_TINT_ID_QUEUE_LINE3:
            vertexColor.rgb = COLOR_TEXT_LIGHT_GRAY;
            break;

        case TEXT_TINT_ID_SERVER:
            vertexColor.rgb = COLOR_TEXT_DARK_GRAY;
            break;

        default:
            hasShadow = false;
            break;
    }

    // Cast a manual drop shadow, replacing the vanilla double-draw shadows the server used to send
    if (hasShadow) {
        dataID = DATA_ID_TEXT_SHADOW;
        expandForShadow(pos, texCoord0, corners0to1[context.cornerID], context.atlasSize);
    }
}

void ravengardText() {
    int cornerID = CORNER_ID;

    // Grab important data
    vec4 cornerColor = getCornerColor(Sampler0, UV0); // Color of this corner in the texture
    int cornerColorID = getColorID(cornerColor.rgb);
    int tintColorID = getColorID(Color.rgb);
    vec2 guiSize = getGUISize(ProjMat);
    vec2 guiCenter = floor(guiSize * 0.5);
    vec2 atlasSize = textureSize(Sampler0, 0);
    float guiScale = (ProjMat[0][0] / 2) * (ScreenSize.x + 0.0001);
    vec2 playerWorldPos = CameraBlockPos.xz - CameraOffset.xz;

    float guiLeftFromScoreboard = pos.x + 100000 - guiSize.x;
    float guiTopFromScoreboard = pos.y - guiCenter.y;
    vec2 guiCenterFromScoreboard = vec2(pos.x + 100002 - guiSize.x + guiCenter.x, pos.y);
    float guiRightFromScoreboard = pos.x + 100000;
    float guiBottomFromScoreboard = pos.y - guiCenter.y + guiSize.y;

    // Calculate maximum GUI scale that will reasonably fill the screen
    const vec2 fullMapBaseSize = FULL_MAP_SIZE / FULLSCREEN_MAP_SIZE_PERCENTAGE; // Size that fullscreen map would be in GUI Scale 1
    float fullMapGuiScale = min(ScreenSize.x / fullMapBaseSize.x, ScreenSize.y / fullMapBaseSize.y);
    float fullMapScaleRatio = (fullMapGuiScale / guiScale);

    GuiContext context = GuiContext(
        cornerID, cornerColorID, tintColorID,
        guiSize, guiCenter, atlasSize, guiScale, playerWorldPos, fullMapScaleRatio,
        guiCenterFromScoreboard, guiTopFromScoreboard, guiRightFromScoreboard, guiBottomFromScoreboard);

    // One-shot title animations
    if(tintColorID == TEXT_TINT_ID_TITLE_ANIM && cornerColorID == TEXT_CORNER_ID_TITLE_ANIM) {
        handleTitleAnimation(context);
    }

    // ===== Spell & Effect Cooldowns =====
    else if(cornerColorID == TEXT_CORNER_ID_SPELL_COOLDOWN) {
        handleSpellCooldowns(context);
    }

    // === Hover Effects ===
    else if(cornerColorID == TEXT_CORNER_ID_HOVER) {
        handleHoverEffect(context);
    }

    // === Teammate health bars ===
    else if(cornerColorID == TEXT_CORNER_ID_TEAMMATE_HEALTH) {
        handleTeammateHealth(context);
    }

    // === Menu Backgrounds ===
    else if (cornerColorID == TEXT_CORNER_ID_MENU_BACKGROUND) {
        handleMenuBackground(context);
    }
    
    // ===== Minimap =====
    // Minimap Background
    else if(cornerColorID == TEXT_CORNER_ID_MINIMAP_BG) {
        handleMinimapBackground(context);
    }

    // Minimap icons
    else if(cornerColorID == TEXT_CORNER_ID_MAP_ICON || cornerColorID == TEXT_CORNER_ID_MAP_ICON_LARGE || cornerColorID == TEXT_CORNER_ID_MAP_PLAYER_ICON) {
        handleMinimapIcons(context);
    }

    // Minimap deathwall & warning
    else if(cornerColorID == TEXT_CORNER_ID_DEATHWALL || cornerColorID == TEXT_CORNER_ID_DEATHWALL_WARNING) {
        handleDeathwall(context);
    }

    // Minimap guide line
    else if(cornerColorID == TEXT_CORNER_ID_GUIDE_LINE) {
        handleGuideLine(context);
    }

    // The Actual Map
    else if((cornerColorID & 0xFFFF00) == TEXT_CORNER_ID_MAP_SEGMENT_BASE) {
        handleMapSegments(context);
    }

    // Simple static textures
    else if(tintColorID == TEXT_TINT_ID_STATIC_TEXTURE) {
        handleStaticTextures(context);
    }

    // ===== Custom Text Effects =====
    else {
        handleTextEffects(context);
    }
}