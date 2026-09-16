const { withAndroidManifest, withProjectBuildGradle } = require("expo/config-plugins");

// Sumsub and the app both contribute ML Kit models. Preserve their union when
// Expo regenerates Android instead of relying on edits in the ignored folder.
module.exports = function withSumsubAndroid(config) {
  config = withProjectBuildGradle(config, (next) => {
    const repository = "https://maven.sumsub.com/repository/maven-public/";
    if (!next.modResults.contents.includes(repository)) {
      next.modResults.contents += `\nallprojects { repositories { maven { url '${repository}' } } }\n`;
    }
    return next;
  });
  return withAndroidManifest(config, (next) => {
    const manifest = next.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const application = manifest.application[0];
    const entries = application["meta-data"] ?? [];
    const key = "com.google.mlkit.vision.DEPENDENCIES";
    const existing = entries.find((entry) => entry.$["android:name"] === key);
    const models = new Set((existing?.$["android:value"] ?? "").split(",").filter(Boolean));
    models.add("barcode_ui");
    models.add("face");
    const replacement = { $: { ...(existing?.$ ?? {}), "android:name": key, "android:value": [...models].join(","), "tools:replace": "android:value" } };
    application["meta-data"] = [...entries.filter((entry) => entry.$["android:name"] !== key), replacement];
    return next;
  });
};
