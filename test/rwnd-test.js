describe("rwnd", function() {
  it("should be correctly initialized", function() {
      console.log("!!!!!");
    expect(rwnd).not.toBe(undefined);
    expect(rwndTest).not.toBe(undefined);
  });
  
  it("should load a YAML story without flinching", function() {
      console.log("!!");
    rwnd.loadFile('test/story.yaml', function(game) {
        expect(game).not.toBe(null);
    });
  });
});