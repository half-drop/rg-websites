// =============================================================================
// CONFIGS - Design knobs that can be tweaked to change the look and feel of the UI
// =============================================================================

const vec4 DEATHWALL_WARNING_COLOR = vec4(1.0, 1.0, 1.0, 1.0); // Color of the deathwall warning
const float DEATHWALL_WARNING_THICKNESS = 2.0; // How thick the deathwall warning line is

// === Text Effect Colors ===
const vec3 COLOR_TEXT_WHITE      = vec3(1.0);
const vec4 COLOR_TEXT_SHADOW     = vec4(0.0, 0.0, 0.0, 0.5); // 50% transparent black
const vec3 COLOR_TEXT_GOLD       = vec3(0xFF, 0xCE, 0x47) / 255.0;
const vec3 COLOR_TEXT_LIGHT_GRAY = vec3(0xA8, 0xBF, 0xD2) / 255.0;
const vec3 COLOR_TEXT_DARK_GRAY  = vec3(0x70, 0x75, 0x92) / 255.0;

// === Ravengard Animated Text ===
const int RAVENGARD_FRAME_COUNT = 80; // How many frames are in the animation in total. Should be divisible by the max frames
const float RAVENGARD_FRAME_IDS[] = float[] ( // List of all frame IDs in order that they should play
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,   // Cycle (10 frames)
    10,10,10,10,10,10,10,10,10,10,  // Wait for 10 frames
    0, 0, 0, 0, 0, 10,10,10,10,10,  // Flash once (10 frames)
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,   // Pause for 50 frames
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
);

// === Spell & Effect Cooldowns ===
const vec2 SPELL_OFFSET = vec2(-130, -34);
const float STATUS_EFFECT_BOTTOM = -58.0;
const vec4 SPELL_COOLDOWN_COLOR = vec4(32, 27, 32, 204) / 255.0;

// === Minimap ===
const float MINIMAP_ZOOM = 1.0; // How much to zoom the minimap by (2.0 = 2x zoom in, 0.5 = 2x zoom out)
const vec2 MINIMAP_MARGIN = vec2(7, 7); // The margin between the minimap and the edge of the screen
const float FULLSCREEN_MAP_SIZE_PERCENTAGE = 0.9481481481481482; // Percentage of the screen the fullscreen map should occupy. Chosen to be pixel-perfect at 1080p & 4k

// === Player Icon ===
const float PLAYER_BLIP_CIRCLE_THICKNESS = 0.075;
const int PLAYER_BLIP_TICKS_PER_PULSE = 25;

// === Deathwall ===
const vec4 DEATHWALL_COLOR = vec4(1.0, 0.0, 0.0, 0.25); // Color of the deathwall
const vec4 DEATHWALL_BORDER_COLOR = vec4(137, 26, 29, 255) / 255.0; // Color of the deathwall border
const float DEATHWALL_BORDER_THICKNESS = 2.0;

const int TOOLTIP_TEXTURE_EDGE_MARGIN = 4; // How many empty pixels there are between the edge of the ItemStack tooltip texture

// === Bossbar ===
const float BOSSBAR_PADDING = 169.0; // Minimum padding from the sides of the screen (to make room for minimap)
const int BOSSBAR_TOP = 13; // Top of the bossbar from the top of the screen

// === Health Bar ===
const int HEALTH_BAR_DIST_FROM_BOTTOM = -51;

// === Stamina Bar ===
const int STAMINA_BAR_DIST_FROM_BOTTOM = -30;

// === Casting Bar ===
const int BOSS_CAST_TOP = 41; // Top of the bossbar from the top of the screen
const int CAST_BAR_TOP = 24; // Top of the cast bar from the center of the screen

// === Guide Line Marching Ants ===
const float GUIDE_LINE_THICKNESS = 1.0; // Thickness of the guide line in pixels
const float GUIDE_LINE_MARCH_SPEED = 8000.0;
const float GUIDE_LINE_SEGMENT_LENGTH = 4.0;
const float GUIDE_LINE_GAP_LENGTH = 2.0;


// =============================================================================
// MAGIC NUMBERS - Texture dimensions, and other values that are not for configuration
// =============================================================================

// === Texture & Asset Dimensions ===
const vec2 HYPIXEL_NET_SIZE = vec2(67, 9); // Size of the hypixel.net texture
const vec2 ARROW_AMMO_SIZE = vec2(14, 14); // Size of the arrow ammo texture
const vec2 KEYBIND_ICON_SIZE = vec2(10, 8);
const vec2 RAVENGARD_FULL_SIZE = vec2(63, 121); // Size of the full RAVENGARD animated texture
const vec2 RAVENGARD_FRAME_SIZE = vec2(63, 11); // Height of a single frame in the RAVENGARD animation
const vec2 SPELL_TEXTURE_SIZE = vec2(34, 34);
const vec2 MINIMAP_BACKGROUND_SIZE = vec2(155, 155); // Size of the entire minimap background texture including the border
const vec2 MINIMAP_BORDER = vec2(10, 10); // How thick the border in the minimap texture is
const vec2 MINIMAP_SEGMENT_SIZE = vec2(256, 256); // Size of each minimap segment texture
const vec2 MAP_ICON_SIZE = vec2(13, 13); // Must be square
const vec2 LARGE_MAP_ICON_SIZE = vec2(31, 31); // Must be square
const vec2 FULL_MAP_SIZE = vec2(512, 512); // Size of the full map texture
const vec2 PLAYER_ICON_SIZE = vec2(43, 43); // Player icon needs to be padded for the blip animation
const float SMALLEST_BOSSBAR = 171.0; // Size of the smallest bossbar texture
const float BOSSBAR_STEP = 84.0; // How big each bossbar is from the previous one
const int BOSSBAR_TEXTURE_COUNT = 8; // How many unique bossbar sizes there are
const int BOSSBAR_HEIGHT = 19; // Height of a single bossbar texture
const int HEALTH_SEGMENT_WIDTH = 10; // How many pixels wide one heart is.
const int HEALTH_BAR_HEIGHT = 17;
const int STAMINA_BAR_HEIGHT = 12;
const vec2 HOTBAR_SIZE = vec2(370, 40); // The size of the hotbar texture
const vec2 CAST_BAR_SIZE = vec2(87, 19); // Casting bar texture size
const vec2 QUEUE_BACKGROUND_SIZE = vec2(196, 44);
const vec2 TEAMMATE_HEALTHBAR_SIZE = vec2(46, 8);

// === Server-side Values ===
const int NUM_HEARTS = 20; // This must match how many actual hearts the player will have in-game!
const int MAX_TEAMMATE_HEALTH = 40;

// === Derived Values ===
// Derived from the minimap config
const vec2 MINIMAP_CONTENT_SIZE = MINIMAP_BACKGROUND_SIZE - (MINIMAP_BORDER * 2);
#define MINIMAP_CENTER ((MINIMAP_MARGIN + floor(MINIMAP_BACKGROUND_SIZE / 2)) * vec2(-1, 1))

// Derived from the health bar config
const int HEALTH_BAR_WIDTH = NUM_HEARTS * HEALTH_SEGMENT_WIDTH; // Health bar texture MUST be this width!
// Each row is (12 - numRows) pixels above the previous one (with a minimum of 3px)
#define HEALTHBAR_ROW_HEIGHT (max(3, (12 - ((NUM_HEARTS + 9) / 10))))

// =============================================================================
// VANILLA DATA - Fixed facts about the vanilla Minecraft client.
// =============================================================================

const vec2 VANILLA_BOSSBAR_SIZE = vec2(182, 5);

// Hearts are hard-coded in the client to start at (-91, -39) from the bottom-center of the GUI
const ivec2 VANILLA_HEART_ORIGIN = ivec2(-91, -39); 
const ivec2 VANILLA_HEART_SIZE = ivec2(9, 9);

const ivec2 VANILLA_GENERIC_54_SIZE = ivec2(176, 222);

int getBossbarTextureID(float guiSizeX) {
    float maxWidth = guiSizeX - (BOSSBAR_PADDING * 2);
    int bossbarTextureID = int((maxWidth - SMALLEST_BOSSBAR) / BOSSBAR_STEP);
    return clamp(bossbarTextureID, 0, BOSSBAR_TEXTURE_COUNT - 1);
}

float getBossbarWidth(int textureID) {
    return SMALLEST_BOSSBAR + (BOSSBAR_STEP * textureID);
}

// =============================================================================
// DATA IDs - Rendering flags
// =============================================================================
const int DATA_ID_DEFAULT = -1;
const int DATA_ID_PLAYER_ICON = 1;
const int DATA_ID_MAP_DEATHWALL = 2;
const int DATA_ID_MAP_GUIDE_LINE = 3;
const int DATA_ID_TEXT_SHADOW = 4;


// =============================================================================
// TEXT SHADER COLOR IDs - Used to identify elements in text shaders
// =============================================================================
const int TEXT_CORNER_ID_TITLE_ANIM        = 0xFEFD00;
const int TEXT_TINT_ID_TITLE_ANIM          = 0xFEFD00;
const int TEXT_CORNER_ID_SPELL_COOLDOWN    = 0xFEFD01;
const int TEXT_CORNER_ID_HOVER             = 0xFEFD02;
const int TEXT_CORNER_ID_TEAMMATE_HEALTH   = 0xFEFD03;
const int TEXT_CORNER_ID_MENU_BACKGROUND   = 0xFEFD05;
const int TEXT_CORNER_ID_MINIMAP_BG        = 0xFEFE00;
const int TEXT_CORNER_ID_MAP_ICON          = 0xFEFE01;
const int TEXT_CORNER_ID_MAP_ICON_LARGE    = 0xFEFE02;
const int TEXT_CORNER_ID_MAP_PLAYER_ICON   = 0xFEFE06;
const int TEXT_CORNER_ID_DEATHWALL         = 0xFEFE03;
const int TEXT_CORNER_ID_DEATHWALL_WARNING = 0xFEFE04;
const int TEXT_CORNER_ID_GUIDE_LINE        = 0xFEFE05;
const int TEXT_CORNER_ID_MAP_SEGMENT_BASE  = 0xFEFE00; // Map segments are 0xFEFEXY; the low byte packs segment coords

// Static textures
const int TEXT_TINT_ID_STATIC_TEXTURE      = 0xFEFE00;
const int TEXT_CORNER_ID_ARROW_AMMO        = 0xFEFDFF;
const int TEXT_CORNER_ID_KEYBIND_ICON      = 0xFEFDFE;
const int TEXT_CORNER_ID_HYPIXEL_WATERMARK = 0xFEFDFD;
const int TEXT_CORNER_ID_RAVENGARD_TEXT    = 0xFEFDFC;
const int TEXT_CORNER_ID_QUEUE_BACKGROUND  = 0xFEFDFB;

// Custom text effects
const int TEXT_TINT_ID_BOSS_SPELLCAST        = 0xFEFD00;
const int TEXT_TINT_ID_CAST_BAR              = 0xFEFD02;
const int TEXT_TINT_ID_HEALTH_TEXT           = 0xFEFD04;
const int TEXT_TINT_ID_STAMINA_TEXT          = 0xFEFD06;
const int TEXT_TINT_ID_WIDGETS_LINE1         = 0xFEFD08;
const int TEXT_TINT_ID_WIDGETS_LINE2         = 0xFEFD0A;
const int TEXT_TINT_ID_BOSS_HEALTH           = 0xFEFD0C;
const int TEXT_TINT_ID_BOSS_NAME             = 0xFEFD0E;
const int TEXT_TINT_ID_DATE                  = 0xFEFD10;
const int TEXT_TINT_ID_SERVER                = 0xFEFD12;
const int TEXT_TINT_ID_LEVELUP_NUMBER        = 0xFEFD14;
const int TEXT_TINT_ID_LEVELUP_TEXT          = 0xFEFD16;
const int TEXT_TINT_ID_KEYBINDS              = 0xFEFD18;
const int TEXT_TINT_ID_MENU_TITLE            = 0xFEFD1A;
const int TEXT_TINT_ID_QUEUE_LINE1           = 0xFEFD1C;
const int TEXT_TINT_ID_QUEUE_LINE2           = 0xFEFD1E;
const int TEXT_TINT_ID_QUEUE_LINE3           = 0xFEFD20;

// =============================================================================
// UI SHADER COLOR IDs - Used to identify elements in UI shaders
// =============================================================================
const int UI_CORNER_ID_HEALTH_BAR          = 0xFEFD00;
const int UI_CORNER_ID_STAMINA_BAR         = 0xFEFD01;
const int UI_CORNER_ID_MENU_OVERLAY        = 0xFEFD02;
const int UI_CORNER_ID_BOSSBAR_BG          = 0xFEFD03;
const int UI_CORNER_ID_BOSSBAR_PROGRESS    = 0xFEFD04;
const int UI_CORNER_ID_BOSS_CAST_BG        = 0xFEFD05;
const int UI_CORNER_ID_BOSS_CAST_PROGRESS  = 0xFEFD06;
const int UI_CORNER_ID_CAST_BAR_BG         = 0xFEFD07;
const int UI_CORNER_ID_CAST_BAR_PROGRESS   = 0xFEFD08;
const int UI_CORNER_ID_GENERIC_54          = 0xFEFD09;
const int UI_CORNER_ID_INVENTORY           = 0xFEFD0A;
const int UI_CORNER_ID_HOTBAR              = 0xFEFD0B;