# rwnd

A minimal interactive story engine.

## Quick start

The story is written in either YAML or JSON, with something like:

```
config:
    start: initialStep
    
steps: 
    initialStep:
        text: You are in a cave. You can turn left or right.
        links:
            left: Turn left
            right: Turn right
    left:
        text: You turned left: As you walk, the corridor bends to the right.
        links:
            theEnd: Keep walking
                
    right:
        text: You turned right. As you walk, the corridor bends to the left.
        links:
            theEnd: Keep walking
            
    theEnd:
        text: "You came back to where you came from: the end."
```

1. Write your story in a `game.yaml` (or `game.json`) file at the root
2. Serve with your favorite web server (I like [http-server](https://www.npmjs.com/package/http-server) for development).
3. Play!

The whole thing is made to be hacked as you want, the code being quite short (<300 lines) and hopefully readable.

## Advanced story features

### `setFlag/removeFlag`: Setting flags

You can set and remove flags when reaching a step:

```     
    finding_sword:
        text: "You just found a sword!"
        setFlag: sword
```

```     
    lose_sword:
        text: "You just broke your sword!"
        removeFlag: sword
```

### `ifFlag/ifNotFlag`: Using flags

Flags are used to show or hide links, with the help of an alternate link format:

```     
    monster_encounter:
        text: "A monster attacks you!"
        links:
          flee: Flee
          attack_monster:
            ifFlag: sword
            text: "Attack with your sword"
```

```     
    pnj_encounter:
        text: "Do you have a sword?"
        links:
          pnj_lie:
            ifNotFlag: sword
            text: "Yes (lie)"
```

### `{{#test}}{{/test}}`: Using flags in text

You can also flavor your text with the flags, thanks to Mustache templating.

```                 
    monster:
        text: A goblin appears! {{#sword}}It looks at your sword and hesitates...{{/sword}}
```

### `disableRewindTo`: Prevent rewinding the story

Use this on a step to prevent the user from rewinding the story, up to the specified step:

``` 
    checkpoint:
        disableRewindTo: checkpoint
        text: You finally slained the dragon!
        link: 
            quest2: Next quest
```

To unlock everything, use the special value `-`:

``` 
    theend: 
        disableRewindTo: -
        text: Congratulations, you win!
```

### Configuration keys

* `start`: Mandatory. Sets the initial step.
* `persistFlags`: Allows to persist flags even if you rewind in the story. Unusual, but can lead to interesting gameplay (defaults to false).

## API

### `rwnd.loadFile(url, targetDomId, templateDomId[, callback])`

* `url`: URL to either your YAML or JSON story.
* `targetDomId`: ID of the DOM element where the story will be displayed
* `templateDomId`: ID of a &lt;script> element containing the step template (Mustache syntax), see `index.html` for an example. 
* `callback`: Optional callback to be called when the game has finished loading. The callback gets the `game` as a parameter (its API is not documented, see the sources), or false if the URL yields a 404.

If the story doesn't pass validation, loading the game will throw errors - with hopefully useful messages.

### `rwnd.loadFile(data, targetDomId, templateDomId)`

Same as the previous call, except you're passing the YAML/JSON story directly (string or JSON object). The game will be loaded synchronously and return the `game`.
