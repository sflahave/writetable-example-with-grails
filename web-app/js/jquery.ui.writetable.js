/**
 * Plugin to make a regular HTML table editable. This plugin is intended to be very simple. The goal is
 * simply to add behavior to html tables - to make them editable. It should be applied only to HTML table
 * elements. The table should be embedded in a form so that user input will can be submitted, but that is
 * not strictly required. The table must have  <thead> and <tbody> elements.
 * The plugin not at all concerned with presentational issues. It is expected that users will apply their
 * own CSS to style their tables/grids however they wish. This plugin tries to stay out of the way as much as possible.
 * You can specify a CSS class (or space-separated classes) to be applied to your form inputs (when in edit mode).
 *
 * Note - each <tr> element in your table must have a rowId attribute with a numeric value. For example:
 * <tr rowId="0"></tr>
 * <tr rowId="1"></tr>
 * <tr rowId="2"></tr>
 * These values play a part in the name generated for the form inputs. For example, in a table named 'players' with
 * columns 'firstName' and 'lastName', the text inputs for the first row would be named players[0].firstName and players[0].lastName.
 *
 * The plugin provides hooks for the following events:
 *        - create      : triggered when the plugin is created on a table element
 *        - init        : triggered when the plugin has finished initializing
 *        - destroyed   : triggered when the plugin is annihilated.
 *        - rowAdded    : triggered when a new row is added to the table
 *        - rowRemoved  : triggered when (just before, actually) a row is removed from the table
 *        - rowSelected : triggered when an end-user clicks on a row
 *
 * Plugin's requirements:
 * Primary:
 * -(done) Provide means to specify which columns are NOT editable  - marked as 'editable:false'
 * -(done) Provide a means to add a row
 * -(done) Provide a config option to have a blank row automatically added, such that there will always be a blank row on bottom
 * -(done) Provide a means to edit a cell by clicking on it (or on any other cell in its row, depending on how it is configured).
 * -(done) Provide a means for plugin user to subscribe to certain events, and be notified when the events occur.
 * -(done) Any edited values must be sent along with the submission of any form the table is embedded in.
 * -(done) Provide a means to specify placeholder/watermark values for text input, for end-user prompts
 * -(done) Provide a means to specify the CSS class(es) to be applied to a column's input
 *
 * Secondary:
 * -(todo) Provide config option for setting single-cell or entire row mode
 * -(todo ??) Provide means to sort the table by any of its column headers, ascending or descending
 * -(todo ??) Provide a means to limit the dimensions of the table, and for scrollbars should the table's size exceed its containing dimensions.
 * -(todo) Provide a means to tab through all cells - when user tabs on the last editable cell in a row, the next row should become
 *   editable and the first editable cell in that row should receive focus. Similar logic if user is tabbing backwards.
 *
 * Questions:
 *
 * 1) When a row is deleted, how will that be communicated back to the server? I.e., when the form is submitted.
 * Maybe the server is just responsible for noticing that the row is gone, and should handle synching up?
 *        -Plugin user could handle this by registering a callback handler on the 'rowSelected' event.
 *        But if there is a 'rowAdded' event, there should be a 'rowRemoved' event as well.  The user could then issue an ajax call
 *        to their server process, or add a hidden input element indicating that the row was deleted.
 *        TODO: add 'rowRemoved' event trigger
 * 2) How will/should it handle body cells that span more than one column? (i.e., colspan=2). Is that an issue?
 *      TODO: Write tests for this
 *
 * Options:
 *  tableName:      The name of the overall collection of data; Give an appropriately descriptive name for the data represented in the table.
 *                  For example, if the table represents players a sports team, you might want to set it to tableName:'players'.
 *                  This affects how the form input elements are named (and therefore how they will be handled in your server process when the form
 *                  is submitted). For example, if you have columns named 'firstName' and 'lastName' the form input for the first row in your 'players' table
 *                  will be named players[0].firstName and players[0].lastName. The inputs in the second row would be named players[1].firstName and players[1].lastName, etc...
 *  singleCellEditMode: (boolean, default is false) If true, only a single cell will be editable at one time (i.e., the cell a user clicks on, or tabs to)
 *  enableAddRow:       (boolean, default is true) If true, new rows can be added to the table.
 *  autoAddRow:         (boolean, default is true) If true, a new blank editable row will be added to the table on initialization
 *  columnDefaults:     (JSON object) Default settings for individual columns
 *      -name:   (string) the name of the column; optional - will take on the value in the <th> element if not specified
 *      -type:   (string, default: 'text')  Specifies the type of input for the column. Options include: 'integer', 'money', 'text', 'double',
 *      -editable: (boolean, default: true) If true, the column will be editable.
 *      -required: (boolean, default: false) If true, the column must have a value (no blanks allowed) when an user edits it. Only applies if editable=true
 *      -cssClass: (string) css class name(s) to be applied to an input element
 *      -placeholder: (string) placeholder value to appear in the input element (CSS3 Placeholder attribute)
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *  jquery.metadata.js (Optional)
 *
 * @Author Shawn Flahave
 */

(function ($) {

    $.widget("ui.writetable", {
        options:{
            tableName:'writeable-data',
            singleCellEditMode:false,
            enableAddRow: true,
            autoAddRow: true,
            editModeClass: "writeable-editmode",
            columnDefaults: {
                name: "",
                type: 'text',
                editable: true,
                required: false,
                cssClass:"",
                placeholder:""
            }
        },
        columns:[],

        _create:function () {

            if($.metadata) {
                //make sure to grab the top-level metadata config; ui.widget apparently doesn't do this for us (the metadata plugin stuff, that is)
                this.options = $.extend(true, {}, this.options, this.element.metadata());
            }

            var self = this,
                options = this.options,
                body = this.element.first("tbody");

            self._initColumns();

            body.on( "click", "tr", $.proxy(this._rowSelected, this) );

            if(options.enableAddRow && options.autoAddRow) {
                this.addRow(true); //add a new row, but don't steal focus (yieldFocus=true)
            }
            this._trigger( "create", null, this );  //trigger callback
        },

        _init:function() {
            this._trigger( "init", null, this );  //trigger callback
        },

        _initColumns: function() {
            var self = this;
            self.columns = [];
            var headers = self.element.find("thead th");   //expect headers to be wrapped in a thead
            headers.each(function(index) {
                var colSettings = $.extend({}, self.options.columnDefaults, $.metadata ? $(this).metadata() : self.options.columns[index]);
                self.columns.push({
                    name: colSettings.name,
                    type: colSettings.type,
                    editable: colSettings.editable,
                    required: colSettings.required,
                    cssClass: colSettings.cssClass,
                    placeholder: colSettings.placeholder
                });
            });
        },

        destroy:function () {
            this.element.first("tbody").off( "click", "tr", $.proxy(this._rowSelected, this) );
            $.Widget.prototype.destroy.call( this );
            this._trigger( "destroyed", null, this );  //trigger callback
        },

        _setOption:function (option, value) {
            switch (option) {
                case "singleCellEditMode":
                case "enableAddRow":
                case "autoAddRow":
                    this.options[option] = value;
                    break;
            }

            $.Widget.prototype._setOption.apply(this, arguments);
        },

        _rowSelected:function (event) {
            var self = this;
            var row = $(event.target).closest('tr');

            this._removeBlankRows(row);

            this._makeRowEditable(row);

            var cellInput = $(event.target).closest('td').children('input').first();
            cellInput.focus(); // take the focus
            cellInput.select(); //select all text

            this._trigger( "rowSelected", event, row );  //trigger callback
            return this;
        },

        /**
         * Remove any blank rows, except the row represented by the argument (if given).
         * @param except - (optional) - a jQuery object representing a row that should NOT be removed.
         *                  This param is needed in cases where a new blank row is added and the user clicks on it.
         *                  Without the exception parameter, the new blank row would be removed as soon as the user
         *                  clicks on it. Probably not what you want.
         * @private
         */
        _removeBlankRows: function(except) {
            var self = this;
            var rows = this.element.find("tbody tr");
            if(except) {
                rows = rows.not(except);
            }
            rows.each(function() {
                if(self._rowIsBlank($(this))) {
                    $(this).remove();
                }
            });
        },

        _makeRowEditable: function(row) {
            var self = this;
            if(!row.hasClass(self.options.editModeClass)) {    //only if the row is not already editable
                row.siblings("."+self.options.editModeClass).each(function() {
                    //return any previously active rows to static mode; grab the input value and then hide the input
                    $(this).removeClass(self.options.editModeClass);
                    $(this).children("td").has("input").each(function() {
                        var input = $(this).children("input").first();
                        input.hide();
                        $(this).children("span").show().text(input.val());
                    });
                });

                row.addClass(self.options.editModeClass);

                row.children("td").each(function(index) {
                    if(self.columns[index].editable) {
                        var cell = $(this);
                        self._initEditableCell(cell, index, row.attr('rowId'));
                    }
                });
            }
        },

        /**
         * Prepare a cell for edit mode
         * @param cell
         * @param columnIndex
         * @param rowId
         * @private
         */
        _initEditableCell: function(cell, columnIndex, rowId) {
            var self = this;
            var input = $(cell).children("input").first();
            if(input.size() == 0) {  //if the cell doesn't already have an input, create one
                var name = self.options.tableName + "[" + rowId + "]." + self.columns[columnIndex].name;
                var cssClass = self.columns[columnIndex].cssClass;
                var placeholder = self.columns[columnIndex].placeholder;
                var value = cell.text();

                input = $("<input id='"+name+"' name='"+name+"' type='text'/>");

                if(cssClass) {
                    input.attr("class", cssClass);
                }
                if(placeholder) {
                    input.attr("placeholder", placeholder);
                }
                if(value) {
                    input.val(value.trim());
                }
                var span = $("<span></span>");
                span.text(cell.text());

                cell.empty();
                cell.append(span);
                cell.append(input);
            }

            input.val($("span", cell).text());          //set the input's value to whatever is in the span
            input.show();                               //show the input
            $("span", cell).hide();                     //hide the span
        },

        /**
         * Add a new row.
         * @param yieldFocus - flag to indicate whether the new row should steal focus; a null or false means that
         *                     the new row WILL steal focus. A 'true' value means that the new row will NOT steal
         *                     focus (it will leave the focus alone, or yield it, or however you want to say it).
         * @return {*}
         */
        addRow: function(yieldFocus) {
            if(this._allowNewRow()) {
                var rowId = this._getNextRowId();
                var blankRow = $("<tr></tr>");
                blankRow.attr("rowId", rowId);
                this.element.find("tbody").first().append(blankRow);

                for(var colIndex = 0; colIndex < this.columns.length; colIndex++) {
                    var cell = $("<td></td>");
                    blankRow.append(cell);
                }

                this._makeRowEditable(blankRow);

                if(!yieldFocus) {
                    var input = blankRow.children('td').slice(0, 1).find('input').first();
                    input.focus();
                }

                this._trigger('rowAdded', null, blankRow);
            }
            else {
                //activate the bottom row, which should be empty since we weren't allowed to add a new one.
                var lastRow = this.element.find("tr").last();
                this._makeRowEditable(lastRow);
            }
            return this;
        },

        /**
         * Remove the given row from the table; actually removes it from DOM entirely.
         * This function allows callback handlers to go first,
         * so they have a chance to block the removal if necessary, or do whatever else they might want
         * before the row is actually removed.
         * @param event
         * @param row
         */
        removeRow: function(event, row) {
            //allow callback handlers to act first, so they have a chance to stop propagation if necessary
            this._trigger('rowRemoved', event, row);

            if(!event.isPropagationStopped()) {
                row.remove()
            }
        },

        /**
         * Decide whether to allow a new row to be added. Assumes that new rows are added to the bottom of the
         * table, and that those last rows can be found with the find("tr").last() function.
         * If there is no text value and no value in an input field for any cell, consider it a blank row and therefore
         * judge that we will not allow another blank row to be added.
         * @return {Boolean}
         * @private
         */
        _allowNewRow: function() {
            if(!this.options.enableAddRow) {
                return false;
            }

            var bodyRows = this.element.find("tbody tr")

            if (bodyRows.length > 0) {
                var lastRow = bodyRows.last();
                return (this._rowIsBlank(lastRow) != true);
            }
            else {
                return true;
            }
        },

        /**
         * Determines if the given row has any values in it; that is, if all cells are blank/empty.
         * @param row - a jQuery object representing a <tr> element
         * @return {Boolean}
         * @private
         */
        _rowIsBlank: function(row) {
            var isBlank = true;
            row.children('td').each(function(i) {
                var td = $(this);
                if(td.text().trim() != '' || td.children("input").first().val()) {
                    isBlank = false;
                    return;
                }
            });

            return isBlank;
        },

        getNumColumns: function() {
            return this.columns.length;
        },

        _getNextRowId: function() {
            var maxId = -1;
            var rows = this.element.find("tbody tr[rowId]");
            rows.each(function() {
                maxId = Math.max(maxId, parseInt($(this).attr('rowId')));
            });
            return ++maxId;
        }
    });

})(jQuery);