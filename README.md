# warlocks-gesture-evaluator
http://games.ravenblack.net/ hosts a game called Warlocks in which players chain gestures together to cast spells. This script evaluates the gestures and adds them to the page so a player does not have to spend as much time figuring out what is available to them and their opponent(s).

## Dependencies
* Greasemonkey - http://www.greasespot.net/ - an addon to Firefox.
* Firefox - http://www.mozilla.com/

## Installation
1. Install Firefox and Greasemonkey. Then download the warlocks script.
1. If you have a previous version of the script installed, uninstall it first - go into manage scripts in Greasemonkey. (This is because the name of the file is changing with the version number and if this ever get popular enough and fixes continue happening, then I'll try figuring out a way around it.)
1. Right click on the download script file and open with Firefox to have it install.

### Set Default Expanded Spell Lists
By default the spell lists for all players is shown collapsed when the page is viewed. This can be changed to be set to show all of the spell lists expanded or only the users spell list. To change this you must edit the script - click the Firefox menu item, `Tools --> Greasemonkey --> Manage User Scripts...`, then highlight this script and click Edit. Search for `defaultSpellListDisplay` and set it to `"none"`, `"user"` or `"all"` as desired. Save the file and you should be in business.
