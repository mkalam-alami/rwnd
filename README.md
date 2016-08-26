# rwnd

A minimal interactive story engine.

## Minimal example

The story is written in either YAML or JSON:

```
config:
    start: 'step1'
    
steps: 

    step1:
        text: "This is step 1."
        links:
            step2: Step 2
            step3: Step 3
            
    step2:
        text: "This is step 2."
        links:
            step3: Step 3
                
    step3:
        text: "This is step 3."
        links:
            theEnd: The end
            
    theEnd:
        text: "This is the end."
```

Just put your story in a `game.yaml` at the root, serve with your favorite web server (I like [http-server](https://www.npmjs.com/package/http-server) for development) and play by browsing to `index.html`.

The whole thing is made to be hacked as you want, the code being quite short (<300 lines), and hopefully readable.

## Features

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
        text: A monster attacks you!
        links:
          flee: Flee
          attack_monster:
            ifFlag: sword
            text: Attack with your sword
```

```     
    pnj_encounter:
        text: Do you have a sword?
        links:
          pnj_lie:
            ifNotFlag: sword
            text: Yes (lie)
```

### Configuration

* `start`: Mandatory. Sets the initial step.
* `persistFlags`: Allows to persist flags even if you rewind in the story. Unusual, but can lead to interesting gameplay (defaults to false).
