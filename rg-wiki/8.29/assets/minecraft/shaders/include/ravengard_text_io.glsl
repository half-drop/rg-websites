IN_OUT vec3 pos;
IN_OUT vec2 corner;
IN_OUT vec3 spellPixelCoord; // Z is whether this is a spell or not (-1 = no, 1 = yes)
IN_OUT vec4 cropCoords; // Where the fragment shader should crop to. XY is top left, ZW is bottom right
IN_OUT vec4 cutoutCoords; // Where the fragment shader should cut out the deathwall. XY is top left, ZW is bottom right
IN_OUT vec2 direction;
IN_OUT float sampleScale; // Sharp-filter magnification in screen pixels per texel (0 = plain texture sampling)
IN_OUT vec4 sampleBounds; // Samplable texel region for the sharp filter (xy = min, zw = max)
IN_OUT vec3 uvTopLeft;
IN_OUT vec3 uvBottomRight;

flat IN_OUT int dataID;
