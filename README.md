# rwnd

A minimal interactive story engine.

## Quick start

The story is written in either YAML or JSON, with something like:

```
steps: 
    start:
        text: You are in a cave, you can turn left or right.
        links:
            -   to: left
                text: Turn left
            -   to: right
                text: Turn right
            
    left:
        text: |
            You turned left.
            You find a sword on the floor!
        links:
            -   to: left_continue
                set: sword
                text: Grab the sword
            -   to: left_continue
                text: Leave the sword
[...]
```

1. Write your story in a `game.yml` (or `game.json`) file at the root
2. Serve with your favorite web server (I like [http-server](https://www.npmjs.com/package/http-server) for development).
3. Play!

## Made with rwnd

* [demo rwnd game](https://mkalam-alami.github.io/rwnd/)
* [red spade ♠](marwane.kalam-alami.net/ld/36/?en)

## Advanced story syntax

### `set/unset`: Writing flags

You can manipulate flags when reaching a step:

```     
    pick_sword:
        text: You just picked a sword!
        set: sword
```

```     
    lose_sword:
        text: You just broke your sword!
        unset: sword
```

It also works on links:

```   
    find_sword:
        text: You find a sword.
        links:
            -   to: encounter
                set: sword
                text: Grab the sword
            -   to: encounter
                text: Leave the sword
```

### `if/ifNot`: Reading flags

The main purpose of flags is to show or hide links:

```     
    monster_encounter:
        text: A monster attacks you!
        links:
            -   flee: Flee
            -   attack_monster:
                if: sword
                text: Attack with your sword
```

```     
    pnj_encounter:
        text: Do you have a sword?
        links:
            -   pnj_lie:
                ifNot: sword
                text: Yes (lie)
```

### `redirects`: Proceed immediately to the next step

Redirects work like `links`, except they are followed immediately, without displaying links.

``` 
    apple:
        text: You grab the apple.
        redirects:
            -   to: eat
    orange:
        text: You grab the orange.
        redirects:
            -   to: eat
    eat:
        text: You eat it.
```

Of course, they can also work with flags:

``` 
    ending_selection:
        redirects:
            -   to: good_ending
                if: saved_the_world
            -   to: bad_ending
                ifNot: saved_the_world
```

If several redirects are possible, only the first match is followed.

### `disableRewindTo`: Prevent rewinding the story

Use this on a step to prevent the user from rewinding the story, up to the specified step:

``` 
    checkpoint:
        disableRewindTo: checkpoint
        text: You finally slained the dragon!
        link: 
            quest2: Next quest
```

To unlock everything, use the special value `-`.

### Text formatting

Markdown syntax is supported. You can also flavor the text with game flags, thanks to Mustache templating.

```                 
    monster:
        text: |
            "**A goblin appears!** 
            {{^sword}}It attacks you!{{/sword}}{{#sword}}It looks at your sword and hesitates...{{/sword}}"
```

### Configuration keys

```                 
config:
    initialStep:  start   ### String. Allows to customize the initial step (defaults to start).
    saveId:       myGame  ### String. If set, the game will auto-save using that ID.
    persistFlags: false   ### Boolean? Allows to persist flags even if you rewind in the story.
                          ### Unusual, but can lead to cool time travel gameplay (defaults to false).

steps:
[...]
```

## API

Before launching a game, the page must contain 2 HTML elements with specific IDs (unless configured otherwise):

* `rwnd-menu`: The location of the menu. 
* `rwnd-step`: The location of the story. 

Example:

```
<div id="game">
    <div id="rwnd-menu"></div>
    <div id="rwnd-steps"></div>
</div>
```

### `rwnd.run(url[, options])`

All options are advanced, optional stuff.

* `url`: String. URL to either your YAML or JSON story.
* `options.callback`: Function. Optional callback to be called when the game has finished loading. The callback gets the `game` as a parameter (its API is not documented, see the sources), or false if the URL yields a 404.
* `options.disableDefaultCss`: Boolean. Prevents appending the default CSS.
* `options.menuEl`: DOM Element. Sets a custom location for the menu.
* `options.menuTemplate`: String. Replaces the default menu HTML with your own. Your HTML must contain elements with IDs `rwnd-cancel` and `rwnd-restart`.
* `options.stepsEl`: DOM Element. Sets a custom location for the story.
* `options.stepTemplate`: String. Replaces the default step HTML (Mustache template) with your own. See the sources for an example.
* `options.customView`: Allows to completely replace the default game view with your own JS code. The object must have the same public API (see sources). Note that replacing the view will make all other options (but `callback`) obsolete.

### `rwnd.runString(data[, options])`

Same as the previous call, except you're passing the YAML/JSON story directly (string or JSON object). The game will be loaded synchronously and return the `game`.

### `rwnd.download(url, callback)`

A little helper function in case you want to download one or several story files manually. The callback arguments are `[statusCode, text]`.
