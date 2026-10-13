import { registerRoot } from "remotion";
import { installPublicAssetPatch } from "./mocks/publicAssetPatch";
import { RemotionRoot } from "./Root";

installPublicAssetPatch();
registerRoot(RemotionRoot);
