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
            expect(game.view.matchHistory(['start'])).toBe(true);
            done();
        });
    });
    
    // links
    
    it("should follow a clicked link", function(done) {
        rwndTest.run('story-minimal.yml', function(game) {
            game.view.clickLink('start', 1);
            expect(game.view.matchHistory(['start', 'right'])).toBe(true);
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
    
});