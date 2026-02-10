# ui-config.json

The user interface in the Tapestry app is configured with this file. A connector can have any number of inputs, specified as an `Array`. Each input has this required property:

  * name: `String` with the name of the input. This value is used to generate variables for `plugin.js`.

And these optional properties:

  * type: `String` with the type of input: "text", "switch", "choices".
  * prompt: `String` with the name displayed in the user interface.
  * placeholder: `String` with a placeholder value for the user interface.
  * value: `String` with a default value.
  * choices: `String` with a comma separated list of values that will be displayed in a menu.

If no `prompt` is specified, the capitalized name of the variable is used. If no `type` is specified, "text" will be assumed.

A variable with the type `switch` will present a switch in the configuration interface and sets a value of "on" or "off" (the default value). A `choices` type uses a popup menu with the strings in a comma separated list, with the default being the first item in the list.

Multiple inputs with the same name will result in undefined behavior. It won't act predictably in the configuration interface or `plugin.js`.

These variables, and the changes that each user makes to them, are persisted by Tapestry. If the configuration of the inputs changes, existing values will be maintained and any new variables will get a default value. Variables that are removed from the configuration will also be removed from the user's persisted values.

## Example

```json
{
	"inputs": [
		{
			"name": "simple"
		},
		{
			"name": "title",
			"type": "text",
			"placeholder": "Enter a description"
		},
		{
			"name": "turbo",
			"type": "switch",
			"prompt": "TURBO",
			"placeholder": "No default value, will be 'off'"
		},
		{
			"name": "reticulate_splines",
			"type": "switch",
			"prompt": "Reticulate Splines",
			"value": "on",
			"placeholder": "When enabled, splines will be reticulated"
		},
		{
			"name": "dessert_choice",
			"type": "choices",
			"prompt": "Dessert Choice",
			"value": "Banana Cream Pie",
			"choices": "Apple Pie,   Banana Cream Pie,Chestnut Pie, Doomsday Cake, Everything Bagel",
			"placeholder": "Choose your dessert"
		}
	]
}
```
