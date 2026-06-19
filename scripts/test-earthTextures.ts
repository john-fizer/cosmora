// scripts/test-earthTextures.ts
import assert from "node:assert";
import { earthTextureSet } from "../src/app/dashboard/map/earthTextures";

const high = earthTextureSet("high");
assert.equal(high.night, "/textures/planets/8k_earth_nightmap.jpg");
assert.equal(high.day,   "/textures/planets/8k_earth_daymap.jpg");
assert.equal(high.clouds,"/textures/planets/8k_earth_clouds.jpg");
assert.equal(high.specular, "/textures/planets/2k_earth_specular_map.jpg");

const low = earthTextureSet("low");
assert.equal(low.night, "/textures/planets/2k_earth_nightmap.jpg");
assert.equal(low.day,   "/textures/planets/2k_earth_daymap.jpg");
assert.equal(low.clouds,"/textures/planets/2k_earth_clouds.jpg");
assert.equal(low.specular, "/textures/planets/2k_earth_specular_map.jpg");

console.log("earthTextures: OK");
