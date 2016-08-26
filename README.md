# rwnd

A minimal interactive story engine.

## Getting started with the default `index.html`

The story is written in either YAML or JSON, with something like:

```
config:
    start: 'initialStep'
    
steps: 

    initialStep:
        text: "You are in a cave. You can turn left or right."
        links:
            left: Turn left
            right: Turn right
            
    left:
        text: "You turned left. As you walk, the corridor bends to the right."
        links:
            theEnd: The end
                
    right:
        text: "You turned right. As you walk, the corridor bends to the left."
        links:
            theEnd: The end
            
    theEnd:
        text: "You came back to where you came from. The end."
```

Just put your story in a `game.yaml` at the root, serve with your favorite web server (I like [http-server](https://www.npmjs.com/package/http-server) for development) and play by browsing to `index.html`.

The whole thing is made to be hacked as you want, the code being quite short (<300 lines), and hopefully readable.

## Story format features

### `setFlag/removeFlag`: Setting flags

You can set and remove flags when landing on a step:

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

Then you can show or hide links according to these flags, by using an alternate link format:

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

## API

### `rwnd.loadFile(url, targetDomId, templateDomId[, callback])`

* `url`: URL to either your YAML or JSON story.
* `targetDomId`: ID of the DOM element where the story will be displayed
* `templateDomId`: ID of a <script> element containing the step template (same syntax as [Underscore's templating](http://underscorejs.org/#template), see `index.html` for an example template). 
* `callback`: Optional callback to be called when the game has finished loading. Gets the `game` as a parameter (its API is not documented, see the sources).

### `rwnd.loadFile(data, targetDomId, templateDomId)`

Same as the previous call, except you're passing the YAML/JSON story directly. The game will be loaded synchronously and return the `game`.
