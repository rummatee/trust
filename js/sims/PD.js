var PEEP_METADATA = {
	   tft: {frame:0, color:"#4089DD"}, 
	 all_d: {frame:1, color:"#52537F"},
	 all_c: {frame:2, color:"#FF75FF"},
	grudge: {frame:3, color:"#efc701"},
	prober: {frame:4, color:"#f6b24c"},
	  tf2t: {frame:5, color:"#88A8CE"},
	pavlov: {frame:6, color:"#86C448"},
	random: {frame:7, color:"#FF5E5E"}
};

var PD = {};
PD.COOPERATE = "COOPERATE";
PD.CHEAT = "CHEAT";

PD.PAYOFFS_DEFAULT = {
	P: 0, // punishment: neither of you get anything
	S: -1, // sucker: you put in coin, other didn't.
	R: 2, // reward: you both put 1 coin in, both got 3 back
	T: 3 // temptation: you put no coin, got 3 coins anyway
};

PD.PAYOFFS = JSON.parse(JSON.stringify(PD.PAYOFFS_DEFAULT));

subscribe("pd/editPayoffs", function(payoffs){
	PD.PAYOFFS = payoffs;
});
subscribe("pd/editPayoffs/P", function(value){ 
    PD.PAYOFFS.P = value;
    publish("rules/resetLimit");
});
subscribe("pd/editPayoffs/S", function(value){ 
    PD.PAYOFFS.S = value;
    publish("rules/resetLimit");
});
subscribe("pd/editPayoffs/R", function(value){
    PD.PAYOFFS.R = value;
    publish("rules/resetLimit");
});
subscribe("pd/editPayoffs/T", function(value){
    PD.PAYOFFS.T = value;
    publish("rules/resetLimit");
});
subscribe("pd/defaultPayoffs", function(){

	PD.PAYOFFS = JSON.parse(JSON.stringify(PD.PAYOFFS_DEFAULT));

	publish("pd/editPayoffs/P", [PD.PAYOFFS.P]);
	publish("pd/editPayoffs/S", [PD.PAYOFFS.S]);
	publish("pd/editPayoffs/R", [PD.PAYOFFS.R]);
	publish("pd/editPayoffs/T", [PD.PAYOFFS.T]);

});

TRUSTPAYOFFS_DEFAULT = {
	R: 1, // punishment: neither of you get anything
	D: -1 // sucker: you put in coin, other didn't.
};

PD.TRUSTPAYOFFS = JSON.parse(JSON.stringify(TRUSTPAYOFFS_DEFAULT));

subscribe("PD/editTrustPayoffs/R", function(value){ PD.TRUSTPAYOFFS.R = value; });
subscribe("PD/editTrustPayoffs/D", function(value){ PD.TRUSTPAYOFFS.D = value; });
subscribe("PD/defaultTrustPayoffs", function(){

	PD.TRUSTPAYOFFS = JSON.parse(JSON.stringify(TRUSTPAYOFFS_DEFAULT));

	publish("PD/editTrustPayoffs/R", [PD.TRUSTPAYOFFS.R]);
	publish("PD/editTrustPayoffs/D", [PD.TRUSTPAYOFFS.D]);

});


PD.NOISE = 0;
subscribe("rules/noise",function(value){
	PD.NOISE = value;
});

PD.AREA = 1;
subscribe("rules/area",function(value){
	PD.AREA = value;
});

PD.LIMIT = PD.PAYOFFS.R*1/1.8;
subscribe("rules/limit",function(value){
	PD.LIMIT = value;
});

PD.REFUSE = 0;
subscribe("rules/refuse",function(value){
	PD.REFUSE = value;
});


PD.getPayoffs = function(move1, move2){
	var payoffs = PD.PAYOFFS;
	if(move1==PD.CHEAT && move2==PD.CHEAT) return [payoffs.P, payoffs.P]; // both punished
	if(move1==PD.COOPERATE && move2==PD.CHEAT) return [payoffs.S, payoffs.T]; // sucker - temptation
	if(move1==PD.CHEAT && move2==PD.COOPERATE) return [payoffs.T, payoffs.S]; // temptation - sucker
	if(move1==PD.COOPERATE && move2==PD.COOPERATE) return [payoffs.R, payoffs.R]; // both rewarded
};

PD.playOneGame = function(playerA, playerB){

	// Make your moves!
	var A = playerA.play();
	var B = playerB.play();

	// Noise: random mistakes, flip around!
	if(Math.random()<PD.NOISE) A = ((A==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE);
	if(Math.random()<PD.NOISE) B = ((B==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE);
	
	// Get payoffs
	var payoffs = PD.getPayoffs(A,B);

	// Remember own & other's moves (or mistakes)
	playerA.remember(A, B);
	playerB.remember(B, A);

	// Add to scores (only in tournament?)
	playerA.addPayoff(payoffs[0]);
	playerB.addPayoff(payoffs[1]);

	// Return the payoffs...
	return payoffs;

};

PD.playRepeatedGame = function(playerA, playerB, turns){

	// I've never met you before, let's pretend
	playerA.resetLogic();
	playerB.resetLogic();

	// Play N turns
	var scores = {
		totalA:0,
		totalB:0,
		payoffs:[]
	};
	for(var i=0; i<turns; i++){
		var p = PD.playOneGame(playerA, playerB);
		scores.payoffs.push(p);
		scores.totalA += p[0];
		scores.totalB += p[1];
	}
	
	PD.updateTrustScores(playerA, playerB, scores, turns);

	// Return the scores...
	return scores;

};

PD.updateTrustScores = function(playerA, playerB, scores, turns){
    var payoffs = PD.PAYOFFS;
    
	if(scores.totalB>PD.LIMIT){
		playerA.updateTrustScore(PD.TRUSTPAYOFFS.R);
	}else{
		playerA.updateTrustScore(PD.TRUSTPAYOFFS.D);
	}
	if(scores.totalA>PD.LIMIT){
		playerB.updateTrustScore(PD.TRUSTPAYOFFS.R);
	}else{
		playerB.updateTrustScore(PD.TRUSTPAYOFFS.D);
	}
};

PD.playOneTournament = function(agents, turns){

	// Reset everyone's coins
	for(var i=0; i<agents.length; i++){
		agents[i].resetCoins();
	}

	// Round robin! not
	for(var i=0; i<agents.length; i++){
		var playerA = agents[i];
		var playerB = PD.selectOponent(agents,i);
        if (playerB){
		    PD.playRepeatedGame(playerA, playerB, turns);
        }
		
	}

};

PD.selectOponent = function(agents, number){
	var max = 0;
        var agent = agents[number];
        var opponents = agent.opponents;
	for(var i=0; i<opponents.length-1; i++){
		if(opponents[i].trustScore>opponents[max].trustScore){
            if(PD.acceptOpponent(opponents[i],agent)){
			    max=i;
            }else {
                return null;
            }
		}
	}
	return opponents[max];
}

PD.acceptOpponent = function(A, B){
    if (B.trustScore<PD.REFUSE){
        return false;
    }
    return true;
}
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

function Logic_tft(){
	var self = this;
	var otherMove = PD.COOPERATE;
	self.play = function(){
		return otherMove;
	};
	self.remember = function(own, other){
		otherMove = other;
	};
}

function Logic_tf2t(){
	var self = this;
	var howManyTimesCheated = 0;
	self.play = function(){
		if(howManyTimesCheated>=2){
			return PD.CHEAT; // retaliate ONLY after two betrayals
		}else{
			return PD.COOPERATE;
		}
	};
	self.remember = function(own, other){
		if(other==PD.CHEAT){
			howManyTimesCheated++;
		}else{
			howManyTimesCheated = 0;
		}
	};
}

function Logic_grudge(){
	var self = this;
	var everCheatedMe = false;
	self.play = function(){
		if(everCheatedMe) return PD.CHEAT;
		return PD.COOPERATE;
	};
	self.remember = function(own, other){
		if(other==PD.CHEAT) everCheatedMe=true;
	};
}

function Logic_all_d(){
	var self = this;
	self.play = function(){
		return PD.CHEAT;
	};
	self.remember = function(own, other){
		// nah
	};
}

function Logic_all_c(){
	var self = this;
	self.play = function(){
		return PD.COOPERATE;
	};
	self.remember = function(own, other){
		// nah
	};
}

function Logic_random(){
	var self = this;
	self.play = function(){
		return (Math.random()>0.5 ? PD.COOPERATE : PD.CHEAT);
	};
	self.remember = function(own, other){
		// nah
	};
}

// Start off Cooperating
// Then, if opponent cooperated, repeat past move. otherwise, switch.
function Logic_pavlov(){
	var self = this;
	var myLastMove = PD.COOPERATE;
	self.play = function(){
		return myLastMove;
	};
	self.remember = function(own, other){
		myLastMove = own; // remember MISTAKEN move
		if(other==PD.CHEAT) myLastMove = ((myLastMove==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE); // switch!
	};
}

// TEST by Cooperate | Cheat | Cooperate | Cooperate
// If EVER retaliates, keep playing TFT
// If NEVER retaliates, switch to ALWAYS DEFECT
function Logic_prober(){

	var self = this;

	var moves = [PD.COOPERATE, PD.CHEAT, PD.COOPERATE, PD.COOPERATE];
	var everCheatedMe = false;

	var otherMove = PD.COOPERATE;
	self.play = function(){
		if(moves.length>0){
			// Testing phase
			var move = moves.shift();
			return move;
		}else{
			if(everCheatedMe){
				return otherMove; // TFT
			}else{
				return PD.CHEAT; // Always Cheat
			}
		}
	};
	self.remember = function(own, other){
		if(moves.length>0){
			if(other==PD.CHEAT) everCheatedMe=true; // Testing phase: ever retaliated?
		}
		otherMove = other; // for TFT
	};

}
