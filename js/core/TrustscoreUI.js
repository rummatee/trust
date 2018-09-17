function TrustscoreUI(config){

    var self = this;
    self.id = config.id;
    self.slideshow = config.slideshow;

    // Create DOM
    self.dom = document.createElement("div");
    self.dom.className = "object";
    var dom = self.dom;
    _configText(config, dom);
    if(config.scale){
        dom.style.transform = "scale("+config.scale+","+config.scale+")";
    }
    
    // Add Image Background
    var bg = new ImageBox({
        src: "assets/ui/payoffs_ui.png",
        x:0, y:0, width:300, height:300
    });
    //dom.appendChild(bg.dom);

    // Labels
    //dom.appendChild(_makeLabel("label_cooperate", {x:148, y:17, rotation:45, align:"center", color:"#cccccc"}));
    //dom.appendChild(_makeLabel("label_cooperate", {x:52, y:17, rotation:-45, align:"center", color:"#cccccc"}));
    //dom.appendChild(_makeLabel("label_cheat", {x:245, y:90, rotation:45, align:"center", color:"#cccccc"}));
    //dom.appendChild(_makeLabel("label_cheat", {x:6, y:90, rotation:-45, align:"center", color:"#cccccc"}));

    // Inc(rement) De(crement) Numbers
    // which are symmetrical, and update each other!
    var numbers = [];
    var _makeIncDec = function(letter,x,y){
        (function(letter,x,y){

            var number = new IncDecNumber({
                x:x, y:y, max:5, min:-5,
                value: PD.TRUSTPAYOFFS[letter],
                onchange: function(value){
                    publish("PD/editTrustPayoffs/"+letter,[value]);
                    publish("trustpayoffs/onchange");
                }
            });
            listen(self, "PD/editTrustPayoffs/"+letter,function(value){
                number.setValue(value);
            });
            number.slideshow = self.slideshow;
            dom.appendChild(number.dom);
            numbers.push(number);

        })(letter,x,y);
    };
        
    var rule_limit = _makeLabel("sandbox_rules_4", {x:125-64, y:177-47, w:433});



    _makeIncDec("R", 101-64, 197-47);

    _makeIncDec("D", 326-64, 197-47);
        
    var slider_limit = new Slider({
        x:125-64, y:197-47, width:177,
        min:PD.PAYOFFS.S*Tournament.NUM_TURNS, max:PD.PAYOFFS.T*Tournament.NUM_TURNS, step:1,
        message: "rules/limit"
    });
        
    slider_limit.slideshow = self.slideshow;
    listen(self, "rules/limit",function(value){
        var words = (value==1) ? Words.get("sandbox_rules_4_single") : Words.get("sandbox_rules_4"); // plural?
        words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
        rule_limit.innerHTML = words;
    });
    listen(self, "rules/resetLimit", function() {
        slider_limit.setBounds({min:PD.PAYOFFS.S*Tournament.NUM_TURNS, max:PD.PAYOFFS.T*Tournament.NUM_TURNS});
        slider_limit.setParam({});
        slider_limit.setValue(PD.PAYOFFS.R*Math.round(Tournament.NUM_TURNS/1.8)); 
        publish("rules/limit");
    });
    dom.appendChild(rule_limit);
    dom.appendChild(slider_limit.dom);
        
    publish("rules/area", [PD.PAYOFFS.R*Tournament.NUM_TURNS/1.8]);



    // Add & Remove
    self.add = function(){ _add(self); };
    self.remove = function(){
        unlisten(self);
        for(var i=0;i<numbers.length;i++) unlisten(numbers[i]);
        for(var i=0;i<self.slideshow.dom.children.length;i++){
            if(self.slideshow.dom.children[i]==self.dom){
                _remove(self);
                break;
            }
        }
    };

}
