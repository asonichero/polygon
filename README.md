# Polygon

A toon-shaded engine in the spirit of the Switch era (*Wind Waker HD*, *Mika and the Witch's Mountain*), built around two characters: **Jack** (21) and **Gerda** (late thirties), both adults. It is the engine that was left when the story (*Climbing Toward Consequence*, a Jack-and-the-Beanstalk game) had its maps, chapters and cutscene beats taken out. The models are smooth, rounded, hand-painted figures with ink outlines, lit by one soft sun under a painted sky.

Everything is three.js (r128, vendored), plain scripts, no build step, no asset files: the geometry is built in code, the textures are painted in code (vector shapes on a 2D canvas), the sound is synthesised. It installs as a mobile web app. The old story is not lost: it is in the git history (`387fd78`, "Import consequence project at repo root"), and so are the earlier blocky and low-poly (N64 / PlayStation) looks of the models.

## Run it

```
npm run serve        # http://localhost:8123/
npm test             # file checks, the pain model, and a headless build of the figures, props and world
```

| Page | What it is |
|---|---|
| `game.html` (`index.html` opens it) | The shell: content notice, title (over a meadow, with Jack and Gerda), settings, pause menu, and the **Sandbox** |
| `models.html` | The model viewer: poses, outfits, expressions, clothes, marks, wireframe, the atlases, switches for ink, glow and shadows |
| `lap.html` | The correction scene and its pose editor |

## The picture (`js/look.js`)

* **Toon shading.** three's own `MeshToonMaterial`, with its shader patched: a soft two-step ramp whose shadows are *tinted* (violet in the shade, warm in the light), and a faint rim light that lifts the edges. `Look.toon({ map, vertexColors })` makes a material in the house style.
* **Ink.** An inverted hull on every model: a second copy of the mesh, drawn back faces only, pushed out along its smooth normals a fixed number of screen pixels, in a darker shade of its own texture (never plain black). `Look.decorate(object)` inks whatever meshes it holds; `userData.noOutline` skips one.
* **Light and sky.** `Look.rig(scene, options)` adds a hemisphere light, a sun with soft shadows, fog and a painted sky dome with drifting clouds that follows the camera.
* **Post.** The scene is drawn multisampled, a bloom gives the bright places their glow, and a gentle grade adds a little colour, contrast and a soft vignette. Nothing else has to change: `Look.attach(renderer)` replaces the renderer's own `render`.
* **Settings** (live; the shell keeps them): ink, glow, shadows and the render size (`look.set({ outline, bloom, shadows, scale })`).

## The models

Jack and Gerda are each about ten thousand triangles: a stack of **rigid, smooth segments on a joint skeleton** (a head, a neck, a torso, a pelvis, two arms of upper arm and forearm and hand, two legs of thigh and shin and foot), with a ball or a dome over every joint so a bend never opens a gap. A shape is lofted from hand-placed rings with a *squareness* exponent for its cross-section (an ellipse for an arm, a rounded square for a jaw or a chest), smoothed with a Catmull-Rom curve between the rings, and textured from one **1024×1024 atlas** per figure painted in code with vector shapes: gradients, curves, tapered strokes, soft blobs, stitches and a little grain.

* **Faces are repainted**: the head is a grid whose front 120° is a flat face plate mapped straight on from the front. An expression redraws that plate with `Poly.Face` (js/poly-face.js): eyes with a lash line and catchlights, brows, a mouth with teeth and tongue, tears, blush, laugh lines.
* **Hair** is a cap that follows the skull with swept locks laid over it (`Poly.lock`), a bun and a pin for Gerda.
* **Jack** has eight named faces (`grin`, `wince`, `gritted`, `crying`, `squint`, `cheeky`, `shy`, `smile`) and four outfits: `Outdoor` (linen shirt under an open green jerkin that stands off it, belt and pouch, patched trousers, boots), `Day` (a soft green tunic over snug shorts, barefoot), `Soft` (a cornflower tunic with a pocket, barefoot), `Fine` (the outdoor clothes dressed up). Trousers and drawers come up and down, and the bare skin takes **marks** cheek by cheek.
* **Gerda** has three faces (`calm`, `stern`, `laughing`) and two outfits: `Work` (plum bodice laced over a blouse, a cream apron tied at the waist, an ankle-length skirt) and `Fine` (a lavender embroidered gown with gold bracelets and anklets hung with moonstones). Her skirt is a closed, flared solid round each leg under a rolled-hem waist piece, so it drapes over her knees when she sits.
* Both are proportioned as grown people, a head about a seventh of their height.

```js
const jack = Poly.makeJack(), gerda = Poly.makeGerda('Work');
jack.paint({ outfit: 'Day', trousers: 'down', drawers: 'down', marks: { L: 0.4, R: 0.6 }, expr: 'wince', hitched: true });
gerda.paint({ outfit: 'Fine', expr: 'stern' });   // repaints only the sheets that changed
Poly.setPose(jack, 'sit');                         // 'stand' | 'sit'; Poly.step(rig, dt) eases toward it
```

### The skeleton

The rig is the one the correction scene was tuned on, joint for joint, so all of its poses still apply: a standing figure is 32 units tall; the hips sit 12 up; the torso is 12 tall with the neck at its top; the shoulders are 10 up it and 5.5 out; an arm is an upper arm of 4 and a forearm of 6 (the hand's end is 10 below the shoulder); a leg is a thigh of 6 and a shin of 6. A rig is `{ root, hips, torso, pelvis, neck, armL/armR (shoulder pivots), elbowL/wristL, elbow/wrist (the right arm), legL/legR: { thigh, knee, shin, foot, sign, ring }, state, target, apply, after, paint(state), stretchShins(k) }`. A scene adds its own motion by setting `rig.after = r => { … }`, which runs at the end of every `apply`.

### The props and the world

`js/props.js` has the chair (a plank seat whose top is at y = 4, where Gerda's thighs rest), the table, the paddle and the birch: rounded boxes and turned legs under painted wood. `js/world.js` has the tiling textures (meadow, flagstones, soil and rock, leaves, bark, a woven rug), the round **island** the sandbox stands on, the wooden **deck** and rug of the correction scene, and trees, bushes and rocks to dress an island (`World.scatter`; the camera hides whatever it is inside).

### Files

| File | What it is |
|---|---|
| `js/look.js` | The picture: toon material, ink, sky and light, post |
| `js/poly-geo.js` | The toolkit: `Atlas` and `Sheet` (a packed texture and its vector painter), `Grid`, `loft` and `sweep` (rings and spines into smooth tubes with a UV for every vertex), `softBox`, `merge` |
| `js/poly.js` | The skeleton, the poses, and the parts both figures share (head, hair, hands, feet) |
| `js/poly-paint.js`, `js/poly-face.js` | The painter's kit (blobs, tapered strokes, curves, stitches, grain) and the face kit (eyes, brows, mouths) |
| `js/poly-jack.js`, `js/poly-jack-paint.js` | Jack: measurements and geometry; the painters for his face, clothes and marks |
| `js/poly-gerda.js`, `js/poly-gerda-paint.js` | Gerda: the same |
| `js/props.js`, `js/world.js` | The props, and the world they stand in |

To add a figure or an outfit, copy the pattern in `poly-jack.js`: list the sheets, build the parts on the bones of `Poly.skeleton()`, write a `paint(state)` that repaints what changed, and list the outfit in `Poly.OUTFITS`.

## The sandbox

A meadow on a floating island, with trees, bushes and rocks about its edge, a few things to jump on (crates, a run of steps, a wall, a pillar), a chair, Gerda, and Jack to walk about as. It exists to show the engine working and has no level in it.

**WASD** (or the stick) moves relative to the camera, Jack turning into the way he goes; **Shift** runs, **C** creeps, **Space** jumps, **E** sits, stands and talks, **drag** turns the camera, **V** or the wheel cycles three zoom levels, **[** and **]** shrink and grow Jack between 50% and 100% (his pace, his jump and the camera's distance follow his size). On a touch screen there is a joystick and buttons for run, creep, jump, act and zoom. The walk is procedural on the rig (swinging thighs, knees that bend through the swing, arms and elbows, a bob, a crouch for creeping, a tucked pose in the air).

## The cutscene toolkit (`js/game.js`)

A cutscene is an async function that awaits the shell's calls; talking to Gerda in the sandbox is an example (`Stage.talk` in `js/stage.js`).

```js
G.cut(spec) / await G.shot(spec, secs, ease)   // the camera: { pos, look, fov }; secs 0 cuts
await G.say('gerda', 'Text.')                    // typed out, with a babbling voice; a tap, space or Enter finishes the line and moves on
G.caption(who, text)                             // a line spoken over the scene while it goes on
const i = await G.choose('jack', ['One', 'Two']) // buttons in the dialogue box, or the keys 1 to 9
await G.fade(true, 1); await G.wait(2)
```

Skipping sets a flag that makes every wait, line and move finish at once, so a scene can be skipped and still land on the right frame. With `?debug` the shell shows pause, back-a-beat and on-a-beat controls (a beat is one camera angle). `G.save(data)` / `G.loadSave()` keep a saved game; settings (volumes, dialogue speed, the picture: ink, glow, shadows, render size) are kept for you.

## The correction scene (`lap.html`, `js/lap.js`, `js/pain.js`)

Gerda gives, Jack receives, across her lap on a plain chair, or bent over a table, on a wooden deck with a rug under the chair. The mechanics are the engine's own:

* **Smack / Run / Stop / End**, with **Pace** and **Strength** steps (Space smacks); a smack is a lift, a hold with the arm raised (that wait builds dread), the strike and a short hold on the skin (which keeps stinging).
* The **pain model** (`js/pain.js`) turns each smack into Jack's **distress**; its bands (composed, flinching, struggling, close to the edge, past it, too harsh) drive his kicks and wriggling and his face. At 1.5 it is too harsh and nothing more is struck.
* **Implements**: the hand, landed with the end of Gerda's forearm on the middle of one cheek at a time; a small rounded paddle held out from her forearm; the birch (for the table). Each has its own weight and sting.
* **Clothes**: trousers up or down, and drawers up or down. Cloth over the rear cushions the sting only.
* **Marks**: the bare rear colours up with the smacks, cheek by cheek, and tender skin hurts more.
* **Red**: the safe word stops everything at once.
* Cameras: Overview, Behind, Over your shoulder, Face and a set for the table; drag to orbit as well.
* **Jack's size** (50–100%): a slider; the contact sites are on his body, so they move and shrink with him, and two sets of poses (made at 100% and at 50%) blend between so the hand always lands.
* **Wardrobe** for both; **Gerda's face** (calm, stern, laughing).
* **Arm poses** over the knee: reaching back for his belt, and pinned behind him with Gerda holding his wrist.

Her swinging arm is solved geometrically (an elbow, a wrist twist): her torso never twists or leans for a strike, the hand's end lands on the cheek being struck, the paddle's blade lies across it and is rolled to the angle of his seat. Offsets tuned by hand sit on top of the procedural pose.

### Pose editor

`lap.html` ▸ **Edit poses** holds the scene at a beat and lets you lay offsets on any bone, live, with sliders or by dragging the joint handles in the view (yellow spheres swing a bone, cyan cubes move it, pink diamonds twist it). **Nothing is stored in the browser**: press **Report**, then paste it into `js/lap-poses.js`. The skeleton the poses were tuned on is unchanged, so the existing ones apply to the models; the contact sites (the two cheeks of Jack's seat) are built where the old block's were.

## Installing as a mobile web app

`manifest.webmanifest` (fullscreen, landscape), `sw.js` (caches the files on first load, so it starts instantly and plays offline) and the head tags in `game.html`. It needs to be served over HTTPS (or localhost): any static host works. On Android and desktop Chrome use the browser menu (Install / Add to Home screen); on iOS Safari use Share, then Add to Home Screen. When you change any file, bump `VERSION` in `sw.js` so installed copies refresh; if you add files the game needs, add them to the `FILES` list there (a test checks both pages and worker agree).

## Content

Polygon is an adult engine: the correction scene shows consensual adult discipline (spanking) between adult characters, with some nudity from the waist down. The shell asks for an 18+ confirmation once and remembers it.
