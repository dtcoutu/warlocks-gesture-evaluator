// ==UserScript==
// @name           Add Gesture Evaluations to Warlocks
// @description    Adds the evaluations of gestures directly into the Warlocks combat page - see http://games.ravenblack.net/.
// @include        http://games.ravenblack.net/warlocks*
// ==/UserScript==

/*
     Copyright 2009 David T. Coutu
     
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
// Indicate whether to disable (false) or enable (true) validation check regarding
// whether Cause Light Wounds was desired instead of Resist Heat.
var enableResistHeatValidation = true;
var bonusSpells = new Object();
// Add entries to this list for unique spells that you want evaluated.  Good for custom league spells.
// These will be evaluated for all games, but will be highlighted in blue instead of red and green.
// Entries should look like the following:
// bonusSpells["<gestures"] = "<spell description>";
// bonusSpells["PSDW"] = "Psychosis - (Amnesia, Paralysis, or Fear)";

function Monster(name, owner)
{
    this.name = name;
    this.nameWithOwner = owner + "\'s " + name;
    this.owner = owner;
}

// TODO: Change hands and spells from arrays to leftGestures, rightGestures
// and leftSpells and rightSpells.
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

function Spell(gestures, name, nonStandard)
{
	this.name = name;
	this.gestures = gestures;
	this.nonStandard = (nonStandard == null) ? false : nonStandard

	// Would like to find someway to make sure given parameter is a Spell
	this.equals = function(spell)
	{
		return ((spell.name == this.name) && (spell.gestures == this.gestures));
	}
}

/* Variable that holds javascript to be applied to modified page. */
var scriptToAdd = "";
var validationChecks = new Object();
var validGesturesRegex = new RegExp("[\-|\>|\?|C|D|F|P|S|W]+");

var spellListing = new Object();

/*
 * Add a style tag to the page.
 */
function addStyle(css)
{
	var head, style;
	head = document.getElementsByTagName("head")[0];
	if (!head) { return; }
	style = document.createElement("style");
	style.type = "text/css";
	style.innerHTML = css;
	head.appendChild(style);
}

/*
 * Make the given string camel-cased by removing any spaces and capitalizing
 * any character following the removed space.
 */
function camelize(input)
{
	var token = " ";
	index = input.indexOf(token);
	result = "";
	if (index == -1)
	{
		return input;
	}
	result += input.substring(0, index);
	
	var nextIndex = index + token.length;
	
	if (input.substring(nextIndex, nextIndex + 1).match(/\s/))
	{
		result += camelize(input.substring(nextIndex));
	}
	else
	{
		result += input.substring(nextIndex, nextIndex + 1).toUpperCase() +
			camelize(input.substring(nextIndex + 1));
	}

	return result;
}

/*
 * Creates the javascript to be used by the program after the greasemonkey
 * script finishes.
 */
function createJavaScript()
{
	var script = document.createElement("script");
	script.innerHTML =
		'\n// Toggle between hiding and showing the section.\n' +
		'function toggleSectionDisplay(sectionId, linkId) {\n' +
		'  var element = document.getElementById(sectionId);\n' +
		'  var link = document.getElementById(linkId);\n' +
		'  if (element.style.display == \'none\') {\n' +
		'    element.style.display = \'\';\n' +
		'    link.replaceChild(document.createTextNode("-"), link.childNodes[0]);\n' +
		'  } else {\n' +
		'    element.style.display = \'none\';\n' +
		'    link.replaceChild(document.createTextNode("+"), link.childNodes[0]);\n' +
		'  }\n' +
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

    forms[0].attributes.getNamedItem('onsubmit').value = "return checkInputs(this);";
	
	scriptToAdd = scriptToAdd +
		'// Make sure inputs make sense.\n' +
		'function checkInputs(form)\n' +
		'{\n' +
		'  var leftHandValue = form.LH[form.LH.selectedIndex].value;\n' +
		'  var leftHandSpellValue = form.LHS[form.LHS.selectedIndex].value;\n' +
		'  var leftHandTargetValue = form.LHT[form.LHT.selectedIndex].value;\n' +
		'  var rightHandValue = form.RH[form.RH.selectedIndex].value;\n' +
		'  var rightHandSpellValue = form.RHS[form.RHS.selectedIndex].value;\n' +
		'  var rightHandTargetValue = form.RHT[form.RHT.selectedIndex].value;\n' +
		'  var bothHandConfirmQuestions = "";\n' +
		'  var leftHandConfirmQuestions = "";\n' +
		'  var rightHandConfirmQuestions = "";\n' +
		'\n' +
		'  if ((leftHandValue == "P") && (rightHandValue == "P"))\n' +
		'  {\n' +
		'    bothHandConfirmQuestions += "  Surrender the match!\\n";\n' +
		'  }\n' +
		'\n';
	
	addConfirmationQuestionsForHand('left', 'right');
	addValidationCheckForHand('left');

	addConfirmationQuestionsForHand('right', 'left');
	addValidationCheckForHand('right');

	scriptToAdd = scriptToAdd +
		'\n' +
		'  if ((leftHandConfirmQuestions != "") || (rightHandConfirmQuestions != "") || (bothHandConfirmQuestions != ""))\n' +
		'  {\n' +
		'    if (leftHandConfirmQuestions != "")\n' +
		'    {\n' +
		'      leftHandConfirmQuestions = "  with your left hand:\\n" + leftHandConfirmQuestions;\n' +
		'    }\n' +
		'    if (rightHandConfirmQuestions != "")\n' +
		'    {\n' +
		'      rightHandConfirmQuestions = "  with your right hand:\\n" + rightHandConfirmQuestions;\n' +
		'    }\n' +
		'    return confirm("Are you sure you want to:\\n" + bothHandConfirmQuestions + leftHandConfirmQuestions + rightHandConfirmQuestions);\n' +
		'  }\n' +
		'  else\n' +
		'  {\n' +
		'    return true;\n' +
		'  }\n' +
		'}\n\n';
}

function addConfirmationQuestionsForHand(primaryHandText, oppositeHandText)
{
	scriptToAdd = scriptToAdd +
		'  if (' + primaryHandText + 'HandValue == "-")\n' +
		'  {\n' +
		'    ' + primaryHandText + 'HandConfirmQuestions += "    - do no gesture with ' + primaryHandText + ' hand\\n";\n' +
		'  }\n' +
		'  if ((' + primaryHandText + 'HandValue == "C") && (' + oppositeHandText + 'HandValue != "C"))\n' +
		'  {\n' +
		'    ' + primaryHandText + 'HandConfirmQuestions += "    - clap only with ' + primaryHandText + ' hand\\n";\n' +
		'  }\n' +
		'\n' +
		'  if ((couldSpellsBeCast.' + primaryHandText + '["PSDD"])\n' +
		'    && (' + primaryHandText + 'HandValue == "D")\n' +
		'    && (' + primaryHandText + 'HandTargetValue != ""))\n' +
		'  {\n' +
		'    // Assumption is that if no elements are found the targetting is not right\n' +
		'    // so let the charm monster targeting check catch it.\n' +
		'    var elements = document.getElementsByName(' + primaryHandText + 'HandTargetValue);\n' +
		'    if ((elements.length > 0)\n' +
		'      && (elements[0].options[elements[0].selectedIndex].value == ""))\n' +
		'    {\n' +
		'      ' + primaryHandText + 'HandConfirmQuestions += "    - not direct the attack of the monster you are charming\\n";\n' +
		'    }\n' +
		'  }\n' +
		'\n';
}

function addValidationCheckForHand(handText)
{
	for (var check in validationChecks)
	{
		scriptToAdd = scriptToAdd +
			'  if ((couldSpellsBeCast.' + handText + '["' + check + '"])\n' +
			'    && (' + handText + 'HandValue == "' + validationChecks[check].gesture + '")';
		if (validationChecks[check].spellValue != undefined)
		{
			scriptToAdd = scriptToAdd +
				'\n    && (' + handText + 'HandSpellValue != "' +
				validationChecks[check].spellValue + '")';
		}
		
		if (validationChecks[check].targetValue != undefined)
		{
			scriptToAdd = scriptToAdd +
				'\n    && (!' + handText + 'HandTargetValue.match(' +
				validationChecks[check].targetValue + '))';
		}
		
		scriptToAdd = scriptToAdd +
		    ')\n' +	
			'  {\n' +
			'    ' + handText + 'HandConfirmQuestions += "' +
			'    - ' +
			validationChecks[check].confirmQuestion + '\\n";\n' +
			'  }\n' +
			'\n';
	}
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
			currentSpell.gestures + ": ");

		if (submittedGestures && currentSpell.nonStandard)
		{
			spellCell.className = "submittedNonStandardComplete";
		}
		else if (submittedGestures)
		{
			spellCell.className = "submittedComplete";
		}
		else if (currentSpell.nonStandard)
		{
			spellCell.className = "nonStandardComplete";
		}
		else
		{
			spellCell.className = "complete";
		}

		spellCell.appendChild(cellText);
		spellCell.appendChild(createSpellNameAnchor(currentSpell.name));

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
			
			if (currentSpell.nonStandard)
			{
				spellCell.className = "nonStandard";
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
				currentSpell.gestures.substr(i) + ": ");

			if ((cellCount % 2) == 1)
			{
				spellCell.className = "alt";
			}
			spellCell.appendChild(cellText);
			spellCell.appendChild(createSpellNameAnchor(currentSpell.name));

			cellArray[cellCount] = spellCell;
		}
	}

	return cellArray;
}

/*
 * Create the HTML anchor tag with the spell name linked to the description
 * provided on the Warlocks site.
 */
function createSpellNameAnchor(spellName)
{
	var anchor = document.createElement("a");
	var spellNameAnchor = spellName.replace(/(\(.*\)|[^a-zA-Z])/g, " ");
	anchor.href = "http://games.ravenblack.net/rules/1/spells.html#" +
		camelize(spellNameAnchor);
	anchor.target = "_blank";
	anchor.appendChild(document.createTextNode(spellName));
	
	return anchor;
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
        expandCollapse.href =
			"javascript:toggleSectionDisplay('" + spellTable.id + "', '" + expandCollapse.id + "')";

       if ((defaultSpellListDisplay == "none")
           || ((defaultSpellListDisplay == "user") && (!player.isUser)))
       {
           expandCollapse.appendChild(document.createTextNode("+"));
           spellTable.style.display = 'none';
       }
       else
       {
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
	   
	    // Create section for unknown gestures, if any.
	    if ((player.hands[0].count('?') > 0) || (player.hands[1].count > 0))
	    {
			var unknownGestureRow = document.createElement("tr");
			var unknownLeftHand = createUnknownGestureDropDowns(player.hands[0], player.name, "left");
			var unknownRightHand = createUnknownGestureDropDowns(player.hands[1], player.name, "right");
			unknownGestureRow.appendChild(unknownLeftHand);
			unknownGestureRow.appendChild(unknownRightHand);
			spellTableBody.appendChild(unknownGestureRow);
	    }
	   
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

function createUnknownGestureDropDowns(playerHand, playerName, handText)
{
	var unknownCell = document.createElement("td");
	// Create gesture drop downs for each unknown gesture
	var gestures = ["?", "-", ">", "C", "D", "F", "P", "S", "W"];
	for (var i=0; i<playerHand.count('?'); i++)
	{
		// Select box can be created once and copied for the others.
		var selectBox = document.createElement("select");
		selectBox.name = "unknown_" + handText + "_" + playerName;
		selectBox.addEventListener("change", updateUnknown, true);
		for (var j=0; j<gestures.length; j++)
		{
			var option = document.createElement("option");
			option.appendChild(document.createTextNode(gestures[j]));
			selectBox.appendChild(option);
		}
		unknownCell.appendChild(selectBox);
	}
	
	return unknownCell;
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
            workingRightGestures = workingRightGestures + rightChar.toLowerCase();
		} else if ((leftChar != "?") && (rightChar == "?")) {
			workingLeftGestures = workingLeftGestures + leftChar.toLowerCase();
            workingRightGestures = workingRightGestures + leftChar.toLowerCase() + "|" + rightChar;
		} else if ((leftChar == "?") && (rightChar != "?")) {
            workingLeftGestures = workingLeftGestures + rightChar.toLowerCase() + "|" + leftChar;
            workingRightGestures = workingRightGestures + rightChar.toLowerCase();
        } else {
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
	var gesturesLength = 1;
    for (var i = gestures.length - 1;
		   (i >= 0);
		   i--, gesturesLength++)
    {
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
			// hands are '?'.  Though I've worked around this with the 
			// ability to fill in unknown gestures.
			currentGesture = "(c|d|f|p|s|w|C|D|F|P|S|W)";
			if (gestures.charAt(i-1) == '|') {
				currentGesture = "(C|D|F|P|S|W" + gestures.charAt(--i) + gestures.charAt(--i) + ")";
			}
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
	
	for (spell in bonusSpells)
	{
		if (expression.test(spell))
		{
			matchedSpells[matchedSpellsIndex] = new Spell(spell, bonusSpells[spell], true);
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
			var leftHandGesture = fonts[(fonts.length-fontsOffset)].textContent.substr(4, 1);
			var rightHandGesture = fonts[(fonts.length-(fontsOffset-1))].textContent.substr(4, 1);
			
			// If maladroit is cast on the player their left hand gesture will show up as an 'X' which is intended to indicate that it
			// is identical to the right hand.
			if (leftHandGesture == "X") {
				leftHandGesture = rightHandGesture;
			}
			
			player.hands[0] = player.hands[0] + leftHandGesture;
			player.hands[1] = player.hands[1] + rightHandGesture;
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
	    "javascript:toggleSectionDisplay('gestures_" + player.name + "', '" + expandCollapse.id + "')";
	expandCollapse.appendChild(document.createTextNode("+"));
	expandCollapseCell.appendChild(expandCollapse);
}

/*
 * Determine if spell identified by the given gestures could be cast in the
 * next round for the user.  Modify javascript on the page being changed by
 * this script to include a variable indicating if it could be cast or not.
 * Further javascript would need to be added to act upon this knowledge.
 */
function identifyCastableSpell(spellGestures, player)
{
	var leftSpell = isSpellCastableByHand(spellGestures, player.spells[0]);
	var rightSpell = isSpellCastableByHand(spellGestures, player.spells[1]);

	scriptToAdd = scriptToAdd +
		'couldSpellsBeCast.left["' + spellGestures +
		'"] = ' + leftSpell + ';\n' +
		'couldSpellsBeCast.right["' + spellGestures +
		'"] = ' + rightSpell + ';\n\n';
	
	return (leftSpell || rightSpell);
}

/*
 * Set indicators of whether each hand could be used to cast charm monster
 * in the next round.
 */
function identifyCharmMonsterCouldBeCast(player)
{
	var charmMonsterGestures = "PSDD";

	identifyCastableSpell(charmMonsterGestures, player);
	
	validationChecks[charmMonsterGestures] = new Object();
	validationChecks[charmMonsterGestures].gesture = "D";
	validationChecks[charmMonsterGestures].targetValue = "/((^(RH:|LH:))|((Goblin|Ogre|Troll|Giant)$))/";
	validationChecks[charmMonsterGestures].confirmQuestion = "target a charm monster spell at a non-monster";
}

/*
 * Set indicators of whether each hand could be used to cast remove
 * enchantment in the next round.
 */
function identifyRemoveEnchantmentCouldBeCast(player)
{
	var removeEnchantmentGestures = "PDWP";

	identifyCastableSpell(removeEnchantmentGestures, player);

	validationChecks[removeEnchantmentGestures] = new Object();
	validationChecks[removeEnchantmentGestures].gesture = "P";
	validationChecks[removeEnchantmentGestures].targetValue = "/^[^.]+$/";
	validationChecks[removeEnchantmentGestures].confirmQuestion = "use the default target of remove enchantment (your opponent)"
}

/*
 * Set indicators of whether each hand could be used to cast resist fire
 * in the next round.
 */
function identifyResistHeatCouldBeCast(player)
{
	if (enableResistHeatValidation)
	{
		var resistFireGestures = "WWFP";
		
		identifyCastableSpell(resistFireGestures, player);
		
		validationChecks[resistFireGestures] = new Object();
		validationChecks[resistFireGestures].gesture = "P";
		validationChecks[resistFireGestures].spellValue = "Cause Light Wounds";
		validationChecks[resistFireGestures].confirmQuestion = "cast Resist Heat instead of Cause Light Wounds";
	}
}

/*
 * Set indicators of whether each hand could be used to summon a monster in
 * the next round.
 */
function identifySummonMonsterCouldBeCast(player)
{
	var summonGoblinGestures = "SFW";
	
	identifyCastableSpell(summonGoblinGestures, player);
	
	validationChecks[summonGoblinGestures] = new Object();
	validationChecks[summonGoblinGestures].gesture = "W";
	validationChecks[summonGoblinGestures].targetValue = "/^$/";
	validationChecks[summonGoblinGestures].confirmQuestion = "target a summon monster spell which gives control to target";
}

/*
 * Return true if the given character is lower case, otherwise false.
 */
function isLowerCase(character)
{
	return ((character >= 'a') && (character <= 'z'));
}

/*
 * Determine if the spell identified by the given gestures could be cast in the
 * next round using the given spells that could be completed for a single hand.
 * Return true if the spell could be completed, otherwise false.
 */
function isSpellCastableByHand(spellGestures, handSpells)
{
	var couldCompleteSpell = false;
	var penultimateGestureCount = spellGestures.length - 1;
	
	if (handSpells.length > penultimateGestureCount)
	{
		for (var x = 0;
			x < handSpells[penultimateGestureCount].length
				&& !couldCompleteSpell;
			x++)
		{
			if (spellGestures == handSpells[penultimateGestureCount][x].gestures)
			{
				couldCompleteSpell = true;
			}
		}
	}
	
	return couldCompleteSpell;
}

/* Function needed to allow loading from event listener. */
function loadSpellListing() {
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
 * Setup the ground work for determing what spells could be cast and the
 * validation desired if they can be.
 */
function processCastableSpells(player)
{
	if (player.isUser)
	{
		scriptToAdd = scriptToAdd +
			'var couldSpellsBeCast = new Object();\n' +
			'couldSpellsBeCast.left = new Object();\n' +
			'couldSpellsBeCast.right = new Object();\n\n';

		identifyCharmMonsterCouldBeCast(player);
		identifyRemoveEnchantmentCouldBeCast(player);
		identifyResistHeatCouldBeCast(player);
		identifySummonMonsterCouldBeCast(player);
	}
}

/*
 * Given a single player evaluate the gestures they are working on and update
 * the player with a list of spells for each hand.
 */
function processPlayerHands(player, unknownReplacements)
{
	// Check for submitted gestures only for the user.
	player.submittedGestures = getSubmittedGestures(player);
	
	player.hands[0] = trimToMaxGesturesToEvaluate(player.hands[0]);
	player.hands[1] = trimToMaxGesturesToEvaluate(player.hands[1]);
	
	player.hands[0] = trimInvalidGestures(player.hands[0]);
	player.hands[1] = trimInvalidGestures(player.hands[1]);
	
	if (unknownReplacements != null)
	{
		// Need to loop through and replace the values in the string appropriately.
		// Still assuming that a '?' will be in both hands everytime.
		for (var i=0; i<unknownReplacements.length; i++) {
			var startIndex = 0;
			var modifiedIndex = 0;
			var altIndex = (i + 1) % unknownReplacements.length;
			for (var j=0; j<unknownReplacements[i].length; j++) {
				var replacementString = unknownReplacements[i].substring(j, j+1);
				var index = player.hands[i].indexOf("?", startIndex);
				player.hands[i] = player.hands[i].substring(0, index) +
					replacementString + player.hands[i].substring(index + 1);
				startIndex = index+modifiedIndex+1;
			}
		}
	}
	
	player.hands = determineBothHandGestures(player.hands);
	
	player.spells[0] = evaluateGestures(player.hands[0]);
	player.spells[1] = evaluateGestures(player.hands[1]);
	
	return player;
}

function processWarlocksPage()
{
	loadSpellListing();
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
					   players[players.length] = player;
					   player.isUser = (player.name == userName);

                       // Don't bother evaluating and creating spell stuff
                       // if the player is no longer in the game.
                       if (player.isStillInGame)
                       {
	                       player = processPlayerHands(player);
	                       
	                       processCastableSpells(player);
	
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

	if (monsters.length > 0) {
		updateMonsterReferences(monsters);
	}
	createJavaScript();
	createInputValidationScripts();
	var script = document.createElement("script");
	script.innerHTML = scriptToAdd;
	document.body.insertBefore(script, document.body.firstChild);

	setSpellTableStyle();
}

function reprocessWarlocksPage(playerName, unknownReplacements)
{
	loadSpellListing();
    var players = new Array();
    var playersIndex = 0;
    var tables = document.getElementsByTagName("table");

	// Use tables[0] to get the name of the using player
    var userName = (tables[0].getElementsByTagName("a"))[0].text;
    // Trim off the "Log out " text
    userName = userName.substr(8);
    
    modifyForGameType();
    // Skip over the next two tables since those contain navigation stuff.
	// Need to account for having the spells in place at this point.
    for (var x=3; x < tables.length; x++)
    {
        var tds = tables[x].getElementsByTagName("td");

        // The first td contains the players name
        var nameAreaNodes = tds[0].getElementsByTagName("a");
        if (nameAreaNodes.length == 1) {
            player = getPlayerObject(tds);
			if (player.isStillInGame) {
				// Skip over their spell section regardless if we update it or not.
				x++;
				if (playerName == player.name) {
					player.isUser = (player.name == userName);

					// Don't bother evaluating and creating spell stuff
					// if the player is no longer in the game.
					player = processPlayerHands(player, unknownReplacements);
					
					processCastableSpells(player);

					var spellTableBody = document.getElementById("spells_" + player.name).firstChild;
					var spellTrs = spellTableBody.childNodes;
					// Skip the first since it holds the headers and the second since it holds the unknowns.
					for (var i=spellTrs.length-1; i>1; i--) {
						spellTableBody.removeChild(spellTrs[i]);
					}
					createSpellSectionContent(player, spellTableBody);
				}
			}
        }
    }
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

/*
 *  Remove all occurrences of a token in a string
 *    input  string to be processed
 *    token  token to be removed
 *  returns new string
 */
function removeToken(input, token)
{
	index = input.indexOf(token);
	result = "";
	if (index == -1)
	{
		return input;
	}
	result += input.substring(0,index) +
		removeToken(input.substring(index + token.length), token);

	return result;
}	

function setSpellTableStyle()
{
	// These only work in greasemonkey - not good for testing...
	addStyle("#spellSection td { padding-right: 6px; }");
	addStyle("#spellSection .alt { color: #AAAAAA; }");
	addStyle("#spellSection .complete { color: #88FF88; font-weight: bold; }");
	addStyle("#spellSection .submittedComplete { color: yellow; font-weight: bold; font-style: italic; }");
	addStyle("#spellSection .nonStandard { text-indent: 0.5em; color: cyan; }");
	addStyle("#spellSection .submittedNonStandardComplete { text-indent: 0.5em; color: yellow; font-weight: bold; font-style: italic; }");
	addStyle("#spellSection .nonStandardComplete { text-indent: 0.5em; color: CornflowerBlue; font-weight: bold; }");
	addStyle("#spellSection th { font-size: smaller; }");
	addStyle("#spellSection strong { color: tomato; }");
	addStyle("#spellSection em { color: yellow; font-weight: bold; }");
	addStyle("#spellSection a { color: #FFFFFF; text-decoration: underline; }");
	addStyle("#spellSection .alt a { color: #AAAAAA; }");
	addStyle("#spellSection .complete a { color: #88FF88; font-weight: bold; }");
	addStyle("#spellSection .submittedComplete a { color: yellow; font-weight: bold; font-style: italic; }");
	addStyle("#spellSection .nonStandardComplete a { color: CornflowerBlue; font-weight: bold; }");
	addStyle("#spellSection .submittedNonStandardComplete a { color: CornflowerBlue; font-weight: bold; }");
	addStyle("#spellSection .nonStandard a { color: cyan; }");
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
 * Trim the gestures down to only the number being used for evaluating gestures.
 */
function trimToMaxGesturesToEvaluate(gestures)
{
    var gesturesToEvaluate = gestures;
	if (gesturesToEvaluate.length > 8)
	{
		gesturesToEvaluate = gesturesToEvaluate.substring(gesturesToEvaluate.length - 8);
	}
	
	return gesturesToEvaluate;
}

/*
 * Modify the name for a monster in the various drop down lists to include
 * the name of the owner so it is easier to identify them.
 */
function updateMonsterReferences(monsters)
{

	var leftHandTarget = document.getElementsByName("LHT")[0];
	updateMonsterReferenceText(leftHandTarget, monsters);
	var rightHandTarget = document.getElementsByName("RHT")[0];
	updateMonsterReferenceText(rightHandTarget, monsters);
	
	for (var x = 0; x < monsters.length; x++) {
		var monsterTarget = document.getElementsByName(monsters[x].name)[0];
		updateMonsterReferenceText(monsterTarget, monsters);
	}
	
	var dropDowns = document.getElementsByTagName("select");
	
	if (dropDowns.length > 0)
	{
		var tables = document.getElementsByTagName("table");
		var tds = tables[tables.length-1].getElementsByTagName("td");
	
		for (var x = 0; x < tds.length; x++)
		{
			for (var z = 0; z < monsters.length; z++)
			{
				if ((tds[x].firstChild != null) &&
					(tds[x].firstChild.nodeValue != null))
				{
					tds[x].firstChild.nodeValue = 
						tds[x].firstChild.nodeValue.replace(
							"Direct " + monsters[z].name,
							"Direct " + monsters[z].nameWithOwner);
				}
			}
		}
	}	
}

function updateMonsterReferenceText(dropDownBox, monsters) {
	if (dropDownBox != null) {
		for (var y = 0; y < dropDownBox.length; y++) {
			for (var x = 0; x < monsters.length; x++) {
				if (monsters[x].name == dropDownBox.options[y].value) {
					dropDownBox.options[y].textContent = monsters[x].nameWithOwner;
				}
			}
		}
	}
}

// Update an unknown value and recalculate the spell section.
// Assigned to the onchange event for the select boxes in a players spell section.
function updateUnknown()
{
	var playerName = this.name.substring(this.name.indexOf("_", 9) + 1);
	
	var unknowns = document.getElementsByName("unknown_left_" + playerName);
	var unknownReplacements = new Array();
	unknownReplacements[0] = "";
	unknownReplacements[1] = "";
	for (var i=0; i<unknowns.length; i++)
	{
		unknownReplacements[0] += unknowns[i][unknowns[i].selectedIndex].value;
	}
	
	unknowns = document.getElementsByName("unknown_right_" + playerName);
	for (var i=0; i<unknowns.length; i++)
	{
		unknownReplacements[1] += unknowns[i][unknowns[i].selectedIndex].value;
	}
	
	reprocessWarlocksPage(playerName, unknownReplacements);
}

String.prototype.count=function(s1) {
	return (this.length - this.replace(new RegExp(RegExp.escape(s1),"g"), '').length) / s1.length;
}
RegExp.escape = (function() {
  var specials = [
    '/', '.', '*', '+', '?', '|',
    '(', ')', '[', ']', '{', '}', '\\'
  ];

  sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
  
  return function(text) {
    return text.replace(sRE, '\\$1');
  }
})();

processWarlocksPage();
