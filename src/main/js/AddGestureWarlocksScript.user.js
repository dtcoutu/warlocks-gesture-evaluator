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

function Player(name, leftHand, rightHand)
{
       this.hands = new Array(2);
       this.hands[0] = leftHand;
       this.hands[1] = rightHand;
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

var spellList = new Array();
spellList[0] = new Spell("cDPW", "Dispel Magic");
spellList[1] = new Spell("cSWWS", "Summon Ice Elemental");
spellList[2] = new Spell("cWSSW", "Summon Fire Elemental");
spellList[3] = new Spell("cw", "Magic Mirror");
spellList[4] = new Spell("DFFDD", "Lightning Bolt");
spellList[5] = new Spell("DFPW", "Cure Heavy Wounds");
spellList[6] = new Spell("DFW", "Cure Light Wounds");
spellList[7] = new Spell("DFWFd", "Blindness");
spellList[8] = new Spell("DPP", "Amnesia");
spellList[9] = new Spell("DSF", "Confusion/Maladroitness");
spellList[10] = new Spell("DSFFFc", "Disease");
spellList[11] = new Spell("DWFFd", "Blindness");
spellList[12] = new Spell("DWSSSP", "Delay Effect");
spellList[13] = new Spell("DWWFWD", "Poison");
spellList[14] = new Spell("FFF", "Paralysis");
spellList[15] = new Spell("FPSFW", "Summon Troll");
spellList[16] = new Spell("FSSDD", "Fireball");
spellList[17] = new Spell("P", "Shield");
spellList[18] = new Spell("p", "! Surrender");
spellList[19] = new Spell("PDWP", "Remove Enchantment");
spellList[20] = new Spell("PPws", "Invisibility");
spellList[21] = new Spell("PSDD", "Charm Monster");
spellList[22] = new Spell("PSDF", "Charm Person");
spellList[23] = new Spell("PSFW", "Summon Ogre");
spellList[24] = new Spell("PWPFSSSD", "Finger of Death");
spellList[25] = new Spell("PWPWWc", "Haste");
spellList[26] = new Spell("SD", "Magic Missile");
spellList[27] = new Spell("SFW", "Summon Goblin");
spellList[28] = new Spell("SPFP", "Anti-spell");
spellList[29] = new Spell("SPFPSDW", "Permanency");
spellList[30] = new Spell("SPPc", "Time Stop");
spellList[31] = new Spell("SPPFD", "Time Stop");
spellList[32] = new Spell("SSFP", "Resist Cold");
spellList[33] = new Spell("SWD", "Fear (No CFDS)");
spellList[34] = new Spell("SWWc", "Fire Storm");
spellList[35] = new Spell("WDDc", "+ Clap of Lightning");
spellList[36] = new Spell("WFP", "Cause Light Wounds");
spellList[37] = new Spell("WFPSFW", "Summon Giant");
spellList[38] = new Spell("WPFD", "Cause Heavy Wounds");
spellList[39] = new Spell("WPP", "Counter Spell");
spellList[40] = new Spell("WSSc", "Ice Storm");
spellList[41] = new Spell("WWFP", "Resist Heat");
spellList[42] = new Spell("WWP", "Protection");
spellList[43] = new Spell("WWS", "Counter Spell");

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
       '}\n';

       document.body.insertBefore(script, document.body.firstChild);
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
       expandCollapse.href =
               "javascript:showSpells('" + player.name + "')";
       expandCollapse.appendChild(document.createTextNode("+"));
       var spellTable = document.createElement("table");
       spellTable.id = "spells_" + player.name;
       spellTable.style.display = 'none';
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
 * Given a string of gestures as a regular expression walk through the list of
 * spells and find ones with gestures that match it.
 */
function getSpellsMatchExpression(expression)
{
       var matchedSpells = new Array();
       var matchedSpellsIndex = 0;
       // Get a list of spells that start with the given gesture
       for (var x = 0; x < spellList.length; x++)
       {
               if (expression.test(spellList[x].gestures))
               {
                       matchedSpells[matchedSpellsIndex] = spellList[x];
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
		var submittedLeftHand = new RegExp("^LH: .$");
		if (submittedLeftHand.test(fonts[(fonts.length-2)].textContent))
		{
			foundSubmittedGestures = true;
			player.hands[0] = player.hands[0] +
				fonts[(fonts.length-2)].textContent.substr(4, 1);
			player.hands[1] = player.hands[1] +
				fonts[(fonts.length-1)].textContent.substr(4, 1);
		}
	}
	
	return foundSubmittedGestures;
}

/*
 * Return true if the given character is lower case, otherwise false.
 */
function isLowerCase(character)
{
       return ((character >= 'a') && (character <= 'z'));
}

/*
 * Given a single player evaluate the gestures they are working on and return
 * a list of spells for each hand.
 */
function processPlayer(player)
{
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

       var players = new Array();
       var playersIndex = 0;
       var tables = document.getElementsByTagName("table");

   // Use tables[0] to get the name of the using player
       var userName = (tables[0].getElementsByTagName("a"))[0].text;
       // Trim off the "Log out " text
       userName = userName.substr(8);

       // Skip over the next two tables since those contain navigation stuff.
       // How do we skip over monsters? - they have owned by info...
       // For now ignore the one monster on this page.
       // Had a bug because the tables array was being updated by the insertion
       // of the new table for displaying the spells.  Don't know why it was
       // working in general though - makes me think I'm leaking something.
       for (var x=3; x < tables.length; x++)
       {
               var tds = tables[x].getElementsByTagName("td");

               // The first td contains the players name
               var nameAreaNodes = tds[0].getElementsByTagName("a");
               if (nameAreaNodes.length == 1)
               {
                       // It's a player instead of a monster so get their name
                       var playerName = nameAreaNodes[0].text;

                       // The third td contains the gestures
                       var fonts = tds[2].getElementsByTagName("font");

                       // First font holds the turn text
                       // Second holds LH: text
                       // Third holds the left hand gestures
					   // Fourth holds RH: text
                       // Fifth holds the right hand gestures
                       player = new Player(
                               nameAreaNodes[0].text,
                               fonts[2].textContent,
                               fonts[4].textContent);
                       player.isUser = (player.name == userName);
                       
                       // Check for submitted gestures only for the user.
                       player.submittedGestures = getSubmittedGestures(player);

                       player = processPlayer(player);

                       createSpellSection(player, tables[x]);
                       // Increment one to skip over table created for spell section.
                       x++;
               }
       }

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

processWarlocksPage();
