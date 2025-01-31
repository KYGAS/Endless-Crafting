//created by Bubble
//changed by TerableCoder
//will keep crafting the last crafted item and use cures

const config = require('./config.js');
module.exports = function EndlessCrafting(dispatch){
	const command = dispatch.command || dispatch.require.command;
	dispatch.game.initialize(["me"]);
	dispatch.game.initialize('inventory'); // call for Tera-Game-State Inventory Submodule

	let craftItem,
		pp,
		cureDbid = 0n,
		timeout = null,
		usepie = false,
		PieCdw;
		
	const PIE_ID = 206023,
		  PIE_AB_ID = 70264;
	
	let myGid,
		oX,
		oY,
		oZ,
		oW;

	command.add('craft', {
		$none(){
    		if(config.enabled){ //send fake failed craft after 5 sec to unlock char
				command.message('Cancel crafting in 5 seconds.');
				clearTimeout(timeout);
				timeout = setTimeout(unlock, 5000);
			}
			config.enabled = !config.enabled;
			command.message('Endless crafting module ' + (config.enabled?'enabled.':'disabled.'));
			if(config.delay < 0){
				config.delay = 0;
				command.message("Invalid config.delay, delay is now " + config.delay);
			}
			return;
    	},
    	unlock(){
	    	unlock();
    	},
		pie(){
			usepie = !usepie;
			command.message("Moule will " + usepie ? "use":"not use" + "pie off cdw once you start crafting.");
		},
		delay(number){
	    	let tempDelay = parseInt(number);
			if(tempDelay >= 0){
				config.delay = tempDelay;
				command.message('Crafting delay set to ' + config.delay);
			} else {
				command.message("Invalid crafting delay. Current delay = " + config.delay);
			}
    	},
		$default(chatLink){
	    	var regexId = /#(\d*)@/;
			var regexDbid = /@(\d*)@/;
			var id = chatLink.match(regexId);
			var dbid = chatLink.match(regexDbid);
			if(id && dbid){
				config.cureId = parseInt(id[1]);
				cureDbid = BigInt(parseInt(dbid[1]));
				command.message('Using pp consumable with id:' + config.cureId);
			} else{
				command.message('Error, not a chatLink nor delay. Please type "craft <Item>" or "craft delay aNumber". Link the item with Ctrl+LMB.');
			}
    	}
	});

	function unlock(){
		clearTimeout(timeout);
		timeout = dispatch.setTimeout(() => {
			dispatch.toClient('S_START_PRODUCE', 3, {
				duration:0
			});
		}, 0);
	}
	
	function usePPPotThenCraft(){
		command.message("Using pp consumable.");
		clearTimeout(timeout);
		timeout = dispatch.setTimeout(() => {
			dispatch.toServer('C_USE_ITEM', 3, {
				gameId: dispatch.game.me.gameId,
				id: config.cureId,
				dbid: cureDbid,
				target: 0,
				amount: 1,
				dest: {x: 0, y: 0, z: 0},
				loc: {x: 0, y: 0, z: 0},
				w: 0,
				unk1: 0,
				unk2: 0,
				unk3: 0,
				unk4: true
			});
			dispatch.hookOnce('S_FATIGABILITY_POINT', 3, (e) => {
				if(config.enabled) dispatch.toServer('C_START_PRODUCE', 1, craftItem);
			});
		}, config.delay);
	}
	
	dispatch.hook('S_FATIGABILITY_POINT', 3, event => {
		if(!event.current){ pp = event.fatigability; } // work for new and old labeling
		else{ (event.fatigability < event.current) ? (pp = event.fatigability):(pp = event.current); }
	});
	
	dispatch.hook('C_START_PRODUCE', 1, event => {
		craftItem = event;
	});
	
	dispatch.hook('S_START_PRODUCE', 3, event => {
		if(config.enabled && pp < 500) usePPPotThenCraft();
	});
	
	dispatch.hook('S_END_PRODUCE', 1, event => {
		if(config.enabled && event.success){
			clearTimeout(timeout);
			timeout = dispatch.setTimeout(() => {
				dispatch.toServer('C_START_PRODUCE', 1, craftItem);
			}, config.delay);
		}
	});
	
	dispatch.hook('S_SYSTEM_MESSAGE', 1, event => {
		if(!config.enabled) return;
    	const msg = dispatch.parseSystemMessage(event.message);
		if(msg && msg.id === 'SMT_YOU_CANT_PRODUCE_NOT_ENOUGH_FATIGUE'){ // no pp
			usePPPotThenCraft();
		}
	});
	
	dispatch.hook('S_LOGIN', 13, (event) => {
        myGid = event.gameId;
    });
	
    dispatch.hook('C_PLAYER_LOCATION', 5, { order: -10 }, (event) => {
        oX = (event.loc.x + event.dest.x) / 2;
        oY = (event.loc.y + event.dest.y) / 2;
        oZ = (event.loc.z + event.dest.z) / 2;
        oW = event.w;
    });
	
	dispatch.hook('S_START_PRODUCE', 3, event => {
		if(!PieCdw) usePieThenCraft();
	});
	
	function usePieThenCraft(){
		command.message("Using pie.");
		clearTimeout(timeout);
		timeout = dispatch.setTimeout(() => {
			
			var pita = dispatch.game.inventory.findInBag(PIE_ID); // get Item Beer
								dispatch.toServer('C_USE_ITEM', 3, {
									gameId: myGid,
									id: pita.id,
									dbid: pita.dbid,
									target: 0,
									amount: 1,
									dest: {x: 0, y: 0, z: 0},
									loc: {x: oX, y: oY, z: oZ},
									w: oW,
									unk1: 0,
									unk2: 0,
									unk3: 0,
									unk4: 1
								});
								
								PieCdw = true;
								
								
			dispatch.hookOnce('S_FATIGABILITY_POINT', 3, (e) => {
				if(config.enabled) dispatch.toServer('C_START_PRODUCE', 1, craftItem);
			});
		}, config.delay);
	}
	
	dispatch.hook('S_ABNORMALITY_END', 1, event => {
		if(!config.enabled){
			if(usepie){
				if(event.target == myGid)
					if(event.id == PIE_AB_ID){
						if (dispatch.game.inventory.getTotalAmountInBag(PIE_ID) > 0){
							PieCdw = false;
						}
						else{
							command.message("You are out of moongourd pies!");
						}
					}
			}
		}
	});
	
};
