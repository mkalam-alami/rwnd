describe("rwnd", function() {
    
    // loading
    
    it("should load a basic YAML story without errors", function(done) {
        rwndTest.run('story-minimal.yml', function(game) {
            expect(game).not.toBe(null);
            done();
        });
    });
    
    it("should only show the starting step at first", function(done) {
        rwndTest.run('story-minimal.yml', function(game) {
            expect(game.view.computeHistory()).toEqual(['start']);
            done();
        });
    });
    
    // links
    
    it("should follow a clicked link", function(done) {
        rwndTest.run('story-minimal.yml', function(game) {
            game.view.clickLink('start', 1);
            expect(game.view.computeHistory()).toEqual(['start', 'right']);
            done();
        });
    });
    
    // flags
    
    it("should set flags when following a link", function(done) {
        rwndTest.run('story-simple.yml', function(game) {
            game.view.clickLink('start', 0);
            expect(game.view.isFlagSet('turnedLeft')).toBe(true);
            done();
        });
    });
    
    it("should set flags when reaching a step", function(done) {
        rwndTest.run('story-simple.yml', function(game) {
            game.view.clickLink('start', 0);
            expect(game.view.isFlagSet('sword')).toBe(true);
            done();
        });
    });
    
    it("should support a full set/unset if/ifNot scenario", function(done) {
        rwndTest.run('story-flags.yml', function(game) {
            var v = game.view;
            v.clickLink('start', 0);
            expect(v.isFlagSet('1')).toBe(true);
            v.matchVisibleLinks(['2']);
            
            v.clickLink('1', 0);
            expect(v.isFlagSet('1')).toBe(false);
            expect(v.isFlagSet('2')).toBe(true);
            expect(v.isFlagSet('list1')).toBe(true);
            expect(v.isFlagSet('list2')).toBe(true);
            v.matchVisibleLinks(['3']);
            
            v.clickLink('2', 0);
            expect(v.isFlagSet('2')).toBe(false);
            expect(v.isFlagSet('list1')).toBe(false);
            
            done();
        });
    });
    
    // redirects
    
    it("should support a full redirect scenario", function(done) {
        rwndTest.run('story-redirect.yml', function(game) {
            game.view.clickLink('start', 0);
            expect(game.view.computeHistory()).toEqual(['start', '0', '1', '2', '3']);
            done();
        });
    });
    
    // TODO test rewind, persistFlags, flags in text, cancel, restart, save/load
    
});