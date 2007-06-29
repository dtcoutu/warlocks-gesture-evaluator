// ==UserScript==
// @name           Add Gesture Evaluations to Warlocks
// @description    Adds the evaluations of gestures directly into the Warlocks combat page - see http://games.ravenblack.net/.
// @include        http://games.ravenblack.net/warlocks*
// ==/UserScript==

/*
     Copyright 2007 David T. Coutu
     
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
     
     	http://www.apache.org/licenses/LICENSE-2.0
     
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. 
 */

// Expects value of "none", "user" or "all" and indicates what spell lists will
// start expanded.
var defaultSpellListDisplay = "none";

function Monster(name, owner)
{
    this.name = name;
    this.nameWithOwner = owner + "\'s " + name;
    this.owner = owner;
}

function Player(name, leftHand, rightHand)
{
	this.hands = new Array(2);
	this.hands[0] = leftHand;
	this.hands[1] = rightHand;
	this.isStillInGame = true;
	this.isUser = false;
	this.name = name;
	this.spells = new Array(2);
	this.submittedGestures = false;
}

function Spell(gestures, name)
{
	this.name = name;
	this.gestures = gestures;

	// Would like to find someway to make sure given parameter is a Spell
	this.equals = function(spell)
	{
		return ((spell.name == this.name) && (spell.gestures == this.gestures));
	}
}

var validGesturesRegex = new RegExp("[\-|\>|\?|C|D|F|P|S|W]+");

var spellListing = new Object();
spellListing["cDPW"] = "Dispel Magic";
spellListing["cSWWS"] = "Summon Ice Elemental";
spellListing["cWSSW"] = "Summon Fire Elemental";
spellListing["cw"] = "Magic Mirror";
spellListing["DFFDD"] = "Lightning Bolt";
spellListing["DFPW"] = "Cure Heavy Wounds";
spellListing["DFW"] = "Cure Light Wounds";
spellListing["DFWFd"] = "Blindness";
spellListing["DPP"] = "Amnesia";
spellListing["DSF"] = "Confusion";
spellListing["DSFFFc"] = "Disease";
spellListing["DWFFd"] = "Blindness";
spellListing["DWSSSP"] = "Delay Effect";
spellListing["DWWFWD"] = "Poison";
spellListing["FFF"] = "Paralysis (CSW --> FDP)";
spellListing["FPSFW"] = "Summon Troll";
spellListing["FSSDD"] = "Fireball";
spellListing["P"] = "Shield";
spellListing["p"] = "! Surrender";
spellListing["PDWP"] = "Remove Enchantment";
spellListing["PPws"] = "Invisibility";
spellListing["PSDD"] = "Charm Monster";
spellListing["PSDF"] = "Charm Person";
spellListing["PSFW"] = "Summon Ogre";
spellListing["PWPFSSSD"] = "Finger of Death";
spellListing["PWPWWc"] = "Haste";
spellListing["SD"] = "Magic Missile";
spellListing["SFW"] = "Summon Goblin";
spellListing["SPFP"] = "Anti-spell";
spellListing["SPFPSDW"] = "Permanency";
spellListing["SPPc"] = "Time Stop";
spellListing["SPPFD"] = "Time Stop";
spellListing["SSFP"] = "Resist Cold";
spellListing["SWD"] = "Fear (No CFDS)";
spellListing["SWWc"] = "Fire Storm";
spellListing["WDDc"] = "+ Clap of Lightning";
spellListing["WFP"] = "Cause Light Wounds";
spellListing["WFPSFW"] = "Summon Giant";
spellListing["WPFD"] = "Cause Heavy Wounds";
spellListing["WPP"] = "Counter Spell";
spellListing["WSSc"] = "Ice Storm";
spellListing["WWFP"] = "Resist Heat";
spellListing["WWP"] = "Protection";
spellListing["WWS"] = "Counter Spell";

/*
 * Creates the javascript to be used by the program after the greasemonkey
 * script finishes.
 */
function createJavaScript()
{
	var script = document.createElement("script");
	script.innerHTML =
		'\n// Display the spell completion table.\n' +
		'function showSpells(playerName) {\n' +
		'  var element = document.getElementById(\'spells_\' + playerName);\n' +
		'  element.style.display = \'\';\n' +
		'  element = document.getElementById(\'expandCollapseLink_\' + playerName);\n' +
		'  var oldLink = element.href;\n' +
		'  element.href = oldLink.replace(/javascript:showSpells/,\n' +
		'      "javascript:hideSpells");\n' +
		'  element.replaceChild(document.createTextNode("-"), element.childNodes[0]);\n' +
		'}\n\n' +
		'// Hide the spell completion table.\n' +
		'function hideSpells(playerName) {\n' +
		'  var element = document.getElementById(\'spells_\' + playerName);\n' +
		'  element.style.display = \'none\';\n' +
		'  element = document.getElementById(\'expandCollapseLink_\' + playerName);\n' +
		'  var oldLink = element.href;\n' +
		'  element.href = oldLink.replace(/javascript:hideSpells/,\n' +
		'      "javascript:showSpells");\n' +
		'  element.replaceChild(document.createTextNode("+"), element.childNodes[0]);\n' +
		'}\n\n' +
		'// Display the spell completion table.\n' +
		'function showGestures(playerName) {\n' +
		'  var element = document.getElementById(\'gestures_\' + playerName);\n' +
		'  element.style.display = \'\';\n' +
		'  element = document.getElementById(\'expandCollapseLink_\' + playerName);\n' +
		'  var oldLink = element.href;\n' +
		'  element.href = oldLink.replace(/javascript:showGestures/,\n' +
		'      "javascript:hideGestures");\n' +
		'  element.replaceChild(document.createTextNode("-"), element.childNodes[0]);\n' +
		'}\n\n' +
		'// Hide the spell completion table.\n' +
		'function hideGestures(playerName) {\n' +
		'  var element = document.getElementById(\'gestures_\' + playerName);\n' +
		'  element.style.display = \'none\';\n' +
		'  element = document.getElementById(\'expandCollapseLink_\' + playerName);\n' +
		'  var oldLink = element.href;\n' +
		'  element.href = oldLink.replace(/javascript:hideGestures/,\n' +
		'      "javascript:showGestures");\n' +
		'  element.replaceChild(document.createTextNode("+"), element.childNodes[0]);\n' +
        '}\n\n';

	document.body.insertBefore(script, document.body.firstChild);
}

/*
 * Add javascript to the screen to check the inputs given and make sure silly
 * mistakes are not being made.
 */
function createInputValidationScripts()
{
	var forms = (document.getElementsByTagName("form"));
	
	if (forms.length != 1)
	{
		return;
	}

	var script = document.createElement("script");
	script.innerHTML =
		'// Make sure inputs make sense.\n' +
		'function checkInputs(form)\n' +
		'{\n' +
		'  var leftHandValue = form.LH[form.LH.selectedIndex].value;\n' +
		'  var leftHandTargetValue = form.LHT[form.LHT.selectedIndex].text;\n' +
		'  var rightHandValue = form.RH[form.RH.selectedIndex].value;\n' +
		'  var rightHandTargetValue = form.RHT[form.RHT.selectedIndex].text;\n' +
		'  var confirmQuestion = "";\n' +
		'\n' +
		'  if (leftHandValue == "-")\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - do no gesture with left hand\\n";\n' +
		'  }\n' +
		'  if ((leftHandValue == "C") && (rightHandValue != "C"))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - clap only with left hand\\n";\n' +
		'  }\n' +
		'  if (rightHandValue == "-")\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - do no gesture with right hand\\n";\n' +
		'  }\n' +
		'  if ((rightHandValue == "C") && (leftHandValue != "C"))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - clap only with right hand\\n";\n' +
		'  }\n' +
		'\n' +
		'  if ((leftMonsterSummons)\n' +
		'    && (leftHandValue == "W")\n' +
		'    && (leftHandTargetValue != ""))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - target a summon spell with left hand (which gives the target ownership)\\n";\n' +
		'  }\n' +
		'  if ((rightMonsterSummons)\n' +
		'    && (rightHandValue == "W")\n' +
		'    && (rightHandTargetValue != ""))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - target a summon spell with right hand (which gives the target ownership)\\n";\n' +
		'  }\n' +
		'\n' +
		'  var monsterNameRegExp = new RegExp("(Goblin|Ogre|Troll|Giant)$");\n' +
		'  if ((leftCharmMonster)\n' +
		'    && (leftHandValue == "D")\n' +
		'    && (!monsterNameRegExp.test(leftHandTargetValue)))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - target a charm monster spell with left hand at a non-monster\\n";\n' +
		'  }\n' +
		'  if ((rightCharmMonster)\n' +
		'    && (rightHandValue == "D")\n' +
		'    && (!monsterNameRegExp.test(rightHandTargetValue)))\n' +
		'  {\n' +
		'    confirmQuestion = confirmQuestion + " - target a charm monster spell with right hand at a non-monster\\n";\n' +
		'  }\n' +
		'\n' +
		'  if (confirmQuestion != "")\n' +
		'  {\n' +
		'    return confirm("Are you sure you want to:\\n" + confirmQuestion);\n' +
		'  }\n' +
		'  else\n' +
		'  {\n' +
		'    return true;\n' +
		'  }\n' +
		'}\n\n';
	document.body.insertBefore(script, document.body.firstChild);

    forms[0].attributes.getNamedItem('onsubmit').value = "return checkInputs(this);";
}

/*
 * Generate the screen elements to display the given hand of spells.  Returns
 * an array of td elements.
 */
function createSpellElements(spells, submittedGestures)
{
	// Deal with complete matches, then go from most gestures matched to least.
	var spellCell;
	var cellCount = 0;
	var cellText;
	var gestureIndex;
	var strongTag;
	var strongText;
	var submittedTag;
	var submittedText;
	var currentSpell;
	var cellArray = new Array();

	for (var x=0; x<spells[0].length; x++, cellCount++)
	{
		currentSpell = spells[0][x];
		spellCell = document.createElement("td");
		var cellText = document.createTextNode(
			currentSpell.gestures + ": " + currentSpell.name);

		if (submittedGestures)
		{
			spellCell.className = "submittedComplete";
		}
		else
		{
			spellCell.className = "complete";
		}
		spellCell.appendChild(cellText);

		cellArray[cellCount] = spellCell;
	}

	for (var i=spells.length - 1; i>=1; i--)
	{
		for (var j=0; j<spells[i].length; j++, cellCount++)
		{
			currentSpell = spells[i][j];
			spellCell = document.createElement("td");
			strongTag = document.createElement("strong");

			gestureIndex = i;
			if (submittedGestures)
			{
				gestureIndex = i-1;
			}

			strongText = document.createTextNode(
				currentSpell.gestures.substr(0, gestureIndex));
			strongTag.appendChild(strongText);
			spellCell.appendChild(strongTag);

			if (submittedGestures)
			{
				submittedTag = document.createElement("em");
				submittedText = document.createTextNode(
					currentSpell.gestures.substr(gestureIndex, 1));
				submittedTag.appendChild(submittedText);
				spellCell.appendChild(submittedTag);
			}
			
			cellText = document.createTextNode(
				currentSpell.gestures.substr(i) + ": " + currentSpell.name);

			if ((cellCount % 2) == 1)
			{
				spellCell.className = "alt";
			}
			spellCell.appendChild(cellText);

			cellArray[cellCount] = spellCell;
		}
	}

	return cellArray;
}

/*
 * Create the section to display the spell information
 */
function createSpellSection(player, table)
{
       // All of this fun is for creating the structure to hold the list
       // of spells the player could cast.
       var spellRow = document.createElement("tr");
       var spellCell = document.createElement("td");
       spellCell.id = "spellSection";
       spellCell.colSpan = 2;
       var expandCollapse = document.createElement("a");
       expandCollapse.id = "expandCollapseLink_" + player.name;
       var spellTable = document.createElement("table");
       spellTable.id = "spells_" + player.name;

       if ((defaultSpellListDisplay == "none")
           || ((defaultSpellListDisplay == "user") && (!player.isUser)))
       {
           expandCollapse.href =
               "javascript:showSpells('" + player.name + "')";
           expandCollapse.appendChild(document.createTextNode("+"));
           spellTable.style.display = 'none';
       }
       else
       {
           expandCollapse.href =
               "javascript:hideSpells('" + player.name + "')";
           expandCollapse.appendChild(document.createTextNode("-"));
       }
       
       var spellTableBody = document.createElement("tbody");
       var spellHandHeaderRow = document.createElement("tr");
       var spellHandLeftHeader = document.createElement("th");
       var leftHandHeader = document.createTextNode("Left Hand");
       var spellHandRightHeader = document.createElement("th");
       var rightHandHeader = document.createTextNode("Right Hand");
       spellHandLeftHeader.appendChild(leftHandHeader);
       spellHandRightHeader.appendChild(rightHandHeader);
       spellHandHeaderRow.appendChild(spellHandLeftHeader);
       spellHandHeaderRow.appendChild(spellHandRightHeader);
       spellTableBody.appendChild(spellHandHeaderRow);

       createSpellSectionContent(player, spellTableBody);

       spellTable.appendChild(spellTableBody);
       spellCell.appendChild(expandCollapse);
       spellCell.appendChild(spellTable);
       spellRow.appendChild(spellCell);
       (table.getElementsByTagName("tbody"))[0].appendChild(spellRow);
}

/*
 * Create spell section content given the player to get spell information from
 * and the table to insert the content into.
 */
function createSpellSectionContent(player, spellTableBody)
{
       var leftSpellElements = createSpellElements(player.spells[0], player.submittedGestures);
       var rightSpellElements = createSpellElements(player.spells[1], player.submittedGestures);

       var spellRowMinCount = leftSpellElements.length;
       var spellRowMaxCount = rightSpellElements.length;
       if (spellRowMinCount > rightSpellElements.length)
       {
               spellRowMinCount = rightSpellElements.length;
               spellRowMaxCount = leftSpellElements.length;
       }

       for (var i=0; i<spellRowMinCount; i++)
       {
               var currentRow = document.createElement("tr");

               currentRow.appendChild(leftSpellElements[i]);
               currentRow.appendChild(rightSpellElements[i]);

               spellTableBody.appendChild(currentRow);
       }

       for (var j=spellRowMinCount; j<spellRowMaxCount; j++)
       {
               var currentRow = document.createElement("tr");
               var placeHolderCell = document.createElement("td");

               if (j >= leftSpellElements.length)
               {
                       currentRow.appendChild(placeHolderCell);
                       currentRow.appendChild(rightSpellElements[j]);
               }
               else
               {
                       currentRow.appendChild(leftSpellElements[j]);
                       currentRow.appendChild(placeHolderCell);
               }

               spellTableBody.appendChild(currentRow);
       }
}

/*
 * Indicate gestures that were done with both hands by making them lower case.
 */
function determineBothHandGestures(bothHands)
{
       //TODO: Ideally might want to make sure there are equal gestures, but
       //figure the game should take care of that.
       var workingLeftGestures = "";
       var workingRightGestures = "";
       var leftChar = "";
       var rightChar = "";
       for (var i=0; i<bothHands[0].length; i++)
       {
               leftChar = bothHands[0].charAt(i);
               rightChar = bothHands[1].charAt(i);
               if (leftChar == rightChar)
               {
                       workingLeftGestures = workingLeftGestures + leftChar.toLowerCase();
                       workingRightGestures =
                               workingRightGestures + rightChar.toLowerCase();
               }
               else
               {
                       workingLeftGestures = workingLeftGestures + leftChar;
                       workingRightGestures = workingRightGestures + rightChar;
               }
       }

       return [workingLeftGestures, workingRightGestures];
}

/*
 * Given a sequence of gestures evaluate what spells could be cast
 * from them.
 *
 * Returns an array of spells that the gestures of a single hand might be
 * leading up to.
 */
function evaluateGestures(gestures)
{
       var currentGesture = "";
       var gesturesExpression;
       var gesturesToMatch = "";
       var allMatchedSpells = new Array();
       allMatchedSpells[0] = new Array();
       var gestureLength = 0;

       // change allMatchedSpells to be an array of arrays of Spells with 0 index
       // containing all matched spells and the other indexes indicating the number
       // of matched characters.
       for (var i = gestures.length - 1;
               ((i >= 0) && (i > gestures.length - 8));
               i--)
       {
               gesturesLength = gestures.length - i;
               // Unfortunately this plays upon the understanding that the gestures
               // will be used within a regular expression - tighter coupling than
               // desired.
               currentGesture = gestures.charAt(i);
               if (isLowerCase(currentGesture))
               {
                       currentGesture = "(" + currentGesture + "|" +
                               currentGesture.toUpperCase() + ")";
               }
               else if (currentGesture == '?')
               {
                   // Probably will always be the case, but this assumes both
                   // hands are ?.
                   currentGesture = "(c|d|f|p|s|w|C|D|F|P|S|W)";
               }
               gesturesToMatch = currentGesture + gesturesToMatch;
               var matchedSpells = getMatchedSpells(gesturesToMatch);
               allMatchedSpells[gesturesLength] = new Array();

               // Find completed spells
               for (var x=0; x<matchedSpells.length; x++)
               {
                       var currentSpell = matchedSpells[x];
                       if (gesturesLength == currentSpell.gestures.length)
                       {
                               var index = allMatchedSpells[0].length;
                               allMatchedSpells[0][index] = currentSpell;
                               // Might even use splice to add the item to the other array...
                               matchedSpells.splice(x, 1);
                               // Compensate for removing item from array.
                               x--;
                       }

					   allMatchedSpells = removePreviouslyMatchedSpells(currentSpell, allMatchedSpells);
               }

               allMatchedSpells[gesturesLength] = matchedSpells;
       }

       return allMatchedSpells;
}

/*
 * Given a string of gestures determine which spells begin with it and return
 * them in an array.
 */
function getMatchedSpells(gestures)
{
	return getSpellsMatchExpression(new RegExp("^" + gestures));
}

/*
 * Given the document objects that comprise a player create a Player object
 * to be used by the rest of the application by extracting the information
 * desired from the document objects.
 */
function getPlayerObject(tds)
{
	// determine if player is still in the match
	var healthText = tds[1].textContent;
	var playerStillInGame = true;
	if ((healthText.match(/^Surrendered/))
		|| (healthText.match(/^Dead/)))
	{
		playerStillInGame = false;
	}

	// The third td contains the gestures
	var fonts = tds[2].getElementsByTagName("font");
	var rightHandText;
	
	// First font holds the turn text
	// Second holds LH: text
	// Third holds the left hand gestures
	// Fourth holds RH: text
	// Fifth holds the right hand gestures

	// When looking at previous rounds of a match a second
	// set of <font> tags are put inside of the existing
	// ones.  Therefore the above notes become
	// Fourth holds future left hand gestures
	// Fifth holds RH: text
	// Sixth holds the right hand gestures
	// Seventh holds the future right hand gestures.
	if (fonts[2].childNodes.length > 1)
	{
		rightHandText = fonts[5].childNodes[0].textContent;
	}
	else
	{
		rightHandText = fonts[4].childNodes[0].textContent;
	}

	player = new Player(
		(tds[0].getElementsByTagName("a"))[0].text,
		fonts[2].childNodes[0].textContent,
		rightHandText);
	player.isStillInGame = playerStillInGame;
	
	return player;
}

/*
 * Given a string of gestures as a regular expression walk through the list of
 * spells and find ones with gestures that match it.
 */
function getSpellsMatchExpression(expression)
{
	var matchedSpells = new Array();
	var matchedSpellsIndex = 0;

	for (spell in spellListing)
	{
		if (expression.test(spell))
		{
			matchedSpells[matchedSpellsIndex] = new Spell(spell, spellListing[spell]);
			matchedSpellsIndex++;
		}
	}
       
	return matchedSpells;
}

/*
 * If the player being processed is the user and submitted gestures are found
 * then the gestures are added to the array of gestures for each hand as
 * appropriate and a value of true is returned.  Otherwise nothing is done and
 * false is returned.
 */
function getSubmittedGestures(player)
{
	var foundSubmittedGestures = false;
	
	if (player.isUser)
	{
		var fonts = document.getElementsByTagName("font");
		var submittedLeftHand = new RegExp("^LH: .");
		var fontsOffset = 2;
		if (submittedLeftHand.test(fonts[(fonts.length-2)].textContent))
		{
			foundSubmittedGestures = true;
		}
		else if (submittedLeftHand.test(fonts[(fonts.length-3)].textContent))
		{
			fontsOffset = 3;
			foundSubmittedGestures = true;
		}
		
		if (foundSubmittedGestures)
		{
			player.hands[0] = player.hands[0] +
				fonts[(fonts.length-fontsOffset)].textContent.substr(4, 1);
			player.hands[1] = player.hands[1] +
				fonts[(fonts.length-(fontsOffset-1))].textContent.substr(4, 1);
		}
	}
	
	return foundSubmittedGestures;
}

/*
 * Hide the gestures of the given player, but allow them to be shown if
 * desired.
 */
function hidePlayerGestures(table, player)
{
	// Instead hide the characters gestures.
	// Add tr/td with a tag for expand/collpase
	// Update tr around Turns and gestures with id
	// to be referenced by the previously created
	// expand/collapse.
	
	var tr = (table.rows)[1];
	tr.id = "gestures_" + player.name;
	tr.style.display = 'none';
	               
	var expandCollapseRow = table.insertRow(1);
	var expandCollapseCell = expandCollapseRow.insertCell(0);
	expandCollapseCell.id = "gestureSection";
	expandCollapseCell.colSpan = 2;
	var expandCollapse = document.createElement("a");
	expandCollapse.id = "expandCollapseLink_" + player.name;
	expandCollapse.href =
	    "javascript:showGestures('" + player.name + "')";
	expandCollapse.appendChild(document.createTextNode("+"));
	expandCollapseCell.appendChild(expandCollapse);
}

/*
 * Set indicators of whether each hand could be used to cast charm monster
 * in the next round.
 */
function identifyCharmMonsterCouldBeCast(player)
{
	var leftCharmMonster = false;
	var rightCharmMonster = false;
	
	if (player.isUser)
	{
		if (player.spells[0].length > 3)
		{
			for (var x = 0; x < player.spells[0][3].length; x++)
			{
				if ("PSDD" == (player.spells[0][3][x].gestures))
				{
					leftCharmMonster = true;
				}
			}
		}
		if (player.spells[1].length > 3)
		{
			for (var x = 0; x < player.spells[1][3].length; x++)
			{
				if ("PSDD" == (player.spells[1][3][x].gestures))
				{
					rightCharmMonster = true;
				}
			}
		}
	}

	var script = document.createElement("script");
	script.innerHTML = 'var leftCharmMonster = ' + leftCharmMonster + ';\n' +
	    'var rightCharmMonster = ' + rightCharmMonster + ';\n\n';
	document.body.insertBefore(script, document.body.firstChild);
}

/*
 * Set indicators of whether each hand could be used to summon a monster in
 * the next round.
 */
function identifySummonMonsterCouldBeCast(player)
{
	var leftMonsterSummons = false;
	var rightMonsterSummons = false;
	
	if (player.isUser)
	{
	    if (player.spells[0].length > 2)
	    {
		    for (var y = 0; y < player.spells[0][2].length; y++)
		    {
		        if ("SFW" == (player.spells[0][2][y].gestures))
		        {
		        	leftMonsterSummons = true;
		        }
		    }
		}
		if (player.spells[1].length > 2)
		{
		    for (var y = 0; y < player.spells[1][2].length; y++)
		    {
		        if ("SFW" == (player.spells[1][2][y].gestures))
		        {
		        	rightMonsterSummons = true;
		        }
		    }
		}
	}

	var script = document.createElement("script");
	script.innerHTML = 'var leftMonsterSummons = ' + leftMonsterSummons + ';\n' +
	    'var rightMonsterSummons = ' + rightMonsterSummons + ';\n\n';
	document.body.insertBefore(script, document.body.firstChild);
}

/*
 * Return true if the given character is lower case, otherwise false.
 */
function isLowerCase(character)
{
	return ((character >= 'a') && (character <= 'z'));
}

function modifyForGameType()
{
	var h2Tags = document.getElementsByTagName("h2");
	var gameTitle = h2Tags[h2Tags.length-1].textContent
	
	if (gameTitle.match(/\(Maladroit\)/))
	{
		spellListing["DSF"] = "Maladroitness";
	}
	
	if (gameTitle.match(/\(ParaFC\)/))
	{
		spellListing["FFF"] = "Paralysis (FSW --> CDP)";
	}
	
	if (gameTitle.match(/\(ParaFDF\)/))
	{
		// Make use of any updates to the name of the paralysis spell
		spellListing["FDF"] = spellListing["FFF"];
		spellListing["FDFD"] = spellListing["FFF"];
		spellListing["DSFDFc"] = spellListing["DSFFFc"];
		
		// Remove the old paralysis and disease spells
		delete spellListing["FFF"];
		delete spellListing["DSFFFc"];
	}
}

/*
 * Given a single player evaluate the gestures they are working on and update
 * the player with a list of spells for each hand.
 */
function processPlayerHands(player)
{
	// Check for submitted gestures only for the user.
	player.submittedGestures = getSubmittedGestures(player);
	
	player.hands[0] = trimInvalidGestures(player.hands[0]);
	player.hands[1] = trimInvalidGestures(player.hands[1]);
	
	player.hands = determineBothHandGestures(player.hands);
	
	player.spells[0] = evaluateGestures(player.hands[0]);
	player.spells[1] = evaluateGestures(player.hands[1]);
	
	return player;
}

function processWarlocksPage()
{
       createJavaScript();
       createInputValidationScripts();

       var players = new Array();
       var playersIndex = 0;
       var monsters = new Array();
       var monstersIndex = 0;
       var tables = document.getElementsByTagName("table");

	// Use tables[0] to get the name of the using player
       var userName = (tables[0].getElementsByTagName("a"))[0].text;
       // Trim off the "Log out " text
       userName = userName.substr(8);
       
       modifyForGameType();

       // Skip over the next two tables since those contain navigation stuff.
       for (var x=3; x < tables.length; x++)
       {
               var tds = tables[x].getElementsByTagName("td");

               // The first td contains the players name
               var nameAreaNodes = tds[0].getElementsByTagName("a");
               if (nameAreaNodes.length == 1)
               {
                       player = getPlayerObject(tds);
					   player.isUser = (player.name == userName);

                       // Don't bother evaluating and creating spell stuff
                       // if the player is no longer in the game.
                       if (player.isStillInGame)
                       {
	                       player = processPlayerHands(player);
	                       
	                       identifyCharmMonsterCouldBeCast(player);
	                       identifySummonMonsterCouldBeCast(player);
	
	                       createSpellSection(player, tables[x]);
	                       // Increment one to skip over table created for spell section.
	                       x++;
	                   }
	                   else
	                   {
	                       hidePlayerGestures(tables[x], player);
	                   }
               }
               else
               {
                   // It's a monster if we have not started processing players.
                   if (players.length == 0)
                   {
	                   monsters[monstersIndex] = new Monster(
	                       tds[0].textContent,
	                       tds[2].textContent.substr(10));
	                   monstersIndex++;
	               }
               }
       }

       updateMonsterReferences(monsters);
       setSpellTableStyle();
}

/*
 * Remove the given spell from the list of previously matched spells.
 */
function removePreviouslyMatchedSpells(matchedSpell, previouslyMatched)
{
	var matchedSpells = previouslyMatched;
	for (var y=1; y<matchedSpells.length; y++)
	{
		for (var z=0; z<matchedSpells[y].length; z++)
		{
			var oldSpell = matchedSpells[y][z];
			if (matchedSpell.equals(oldSpell))
			{
				matchedSpells[y].splice(z, 1);
			}
		}
	}
	
	return matchedSpells;
}

function setSpellTableStyle()
{
       if (GM_addStyle)
       {
               // These only work in greasemonkey - not good for testing...
               GM_addStyle("#spellSection td { padding-right: 6px; }");
               GM_addStyle("#spellSection .alt { color: #AAAAAA; }");
               GM_addStyle("#spellSection .complete { color: #88FF88; font-weight: bold; }");
               GM_addStyle("#spellSection .submittedComplete { color: yellow; font-weight: bold; font-style: italics; }");
               GM_addStyle("#spellSection th { font-size: smaller; }");
               GM_addStyle("#spellSection strong { color: tomato; }");
               GM_addStyle("#spellSection em { color: yellow; font-weight: bold; }");
       }
}

/*
 * Remove any characters in the given string that do not equate to a gesture.
 */
function trimInvalidGestures(gestures)
{
       var workingGestures = gestures.toUpperCase();
       var trimmedGestures = "";
       var validGestureMatches;
       
       while ((workingGestures.length > 0)
               && ((validGestureMatches = validGesturesRegex.exec(workingGestures)) != null))
       {
               trimmedGestures = trimmedGestures + validGestureMatches[0];
               var newIndex = validGestureMatches.index + validGestureMatches[0].length;
               workingGestures = workingGestures.substring(newIndex);
       }

       return trimmedGestures;
}

/*
 * Modify the name for a monster in the various drop down lists to include
 * the name of the owner so it is easier to identify them.
 */
function updateMonsterReferences(monsters)
{
       // modify monster's in target drop downs.
       // remember when a monster could possibly be summoned an additional
       // target drop down will appear.
	var dropDowns = document.getElementsByTagName("select");
	
	for (var x = 2; x < dropDowns.length; x++)
	{
	    for (var y = 0; y < dropDowns[x].length; y++)
	    {
	        for (var z = 0; z < monsters.length; z++)
	        {
	            if (monsters[z].name == dropDowns[x].options[y].value)
	            {
	                dropDowns[x].options[y].textContent = monsters[z].nameWithOwner;
	            }
	        }
	    }
	
	    // Need to skip over other non-target drop downs.
	    if (x == 2) x = x + 2;
	}
	
	var tables = document.getElementsByTagName("table");

	for (var z = 0; z < monsters.length; z++)
	{
		tables[8].innerHTML =
			tables[8].innerHTML.replace("Direct " + monsters[z].name,
				"Direct " + monsters[z].nameWithOwner);
	}
}

processWarlocksPage();
