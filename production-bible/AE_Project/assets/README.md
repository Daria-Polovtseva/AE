# assets/

Drop the hero character art here as **`IMG_Character_Doll.png`** (transparent PNG, pre-lit to the scene
key: soft warm light upper-left, cool violet/lavender rim). Optional companion passes:
`IMG_Character_Rim.png`, `IMG_Character_AO.png` (contact shadow). A layered `.psd` (hair-front, head,
torso, arms, skirt, legs, hair-back) enables the optional idle rig.

If no character asset is found at build time, the generator builds a placeholder silhouette + rim so the
scene is complete and runnable (Production Bible §20 R1). The importer looks for the PNG next to the saved
project first, then this folder, then the Desktop.

> Binary art is not committed to the repo; this README documents the drop location and naming contract.
