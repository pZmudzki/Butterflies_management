sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/thirdparty/jquery",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (
    BaseController,
    Filter,
    FilterOperator,
    JSONModel,
    jQuery,
    MessageToast,
    MessageBox
  ) => {
    "use strict";

    return BaseController.extend("ui5.butterflies.controller.App", {
      /**
       * Initializes the controller, sets up models and initial state.
       * @public
       */
      onInit: function () {
        // set explored app's demo model on this sample
        const oJSONModel = this.initSampleDataModel();
        this.setModel(oJSONModel);

        this.setModel(
          new JSONModel({
            globalFilter: "",
            cellFilterOn: false,
          }),
          "filter"
        );

        this.setModel(
          new JSONModel({
            busy: false,
            hasUIChanges: false,
          }),
          "appView"
        );

        this._oGlobalFilter = null;
      },

      /**
       * Initializes the sample data model by loading data from a JSON file.
       * @returns {sap.ui.model.json.JSONModel} The JSON model with the loaded data.
       * @private
       */
      initSampleDataModel: function () {
        const oModel = new JSONModel();

        jQuery.ajax("mockdata/Data.json", {
          dataType: "json",
          success: function (oData) {
            oModel.setData(oData);
          },
          error: function () {
            console.log("failed to load json");
          },
        });

        return oModel;
      },

      /**
       * Applies filters to the table based on the query input.
       * @param {sap.ui.base.Event} oEvent - The event object triggered by the filter input.
       * @public
       */
      applyFilters: function (oEvent) {
        const sQuery = oEvent.getParameter("query");
        this._oGlobalFilter = null;

        if (sQuery) {
          this._oGlobalFilter = new Filter(
            [
              new Filter("Name", FilterOperator.Contains, sQuery),
              new Filter("Family", FilterOperator.Contains, sQuery),
              new Filter("Habitat", FilterOperator.Contains, sQuery),
              new Filter("Migration Pattern", FilterOperator.Contains, sQuery),
              new Filter("Threat Level", FilterOperator.Contains, sQuery),
            ],
            false
          );
        }

        this.byId("butterflies-table")
          .getBinding()
          .filter(this._oGlobalFilter, "Application");
      },

      /**
       * Clears all filters from the table.
       * @public
       */
      clearAllFilters: function () {
        const oTable = this.byId("butterflies-table");

        const oUiModel = this.getModel("filter");
        oUiModel.setProperty("/globalFilter", "");

        this._oGlobalFilter = null;

        this.byId("butterflies-table")
          .getBinding()
          .filter(this._oGlobalFilter, "Application");

        const aColumns = oTable.getColumns();
        for (let i = 0; i < aColumns.length; i++) {
          oTable.filter(aColumns[i], null);
        }
      },

      /**
       * Applies freezing to table rows and columns based on user input.
       * @public
       */
      applyFreeze: function () {
        const oTable = this.byId("butterflies-table");

        // get rows and columns count from input and parse them to integer
        let iColumnCount = parseInt(
          this.getView().byId("freezeColumnsInput").getValue() || 0
        );
        let iRowCount = parseInt(
          this.getView().byId("freezeRowsInput").getValue() || 0
        );

        const iTotalColumnCount = oTable.getColumns().length;
        const iTotalRowCount = oTable.getRows().length;

        // Freeze column if the count doesn't exceed the total column count
        if (iColumnCount > iTotalColumnCount) {
          iColumnCount = iTotalColumnCount;
          this.getView().byId("freezeColumnsInput").setValue(iTotalColumnCount);
        }

        // Freeze row if the count doesn't exceed the total row count
        if (iRowCount > iTotalRowCount) {
          iRowCount = iTotalRowCount;
          this.getView().byId("freezeRowsInput").setValue(iTotalRowCount);
        }

        // apply freeze to the table
        oTable.setFixedColumnCount(iColumnCount);
        oTable.setFixedRowCount(iRowCount);
      },

      /**
       * Opens the dialog for summing up column values.
       * @public
       */
      onSumValueDialog: function () {
        // Create dialog lazily
        this.Dialog("oSVDialog", "ui5.butterflies.view.SumValueDialog");
      },

      /**
       * Handles the change event in the sum dialog, calculates the sum, and updates the UI.
       * @param {sap.ui.base.Event} oEvent - The event object triggered by the dropdown change.
       * @public
       */
      onSumDialogChange: function (oEvent) {
        var sSelectedKey = oEvent.getSource().getSelectedKey();

        // Get the model and the data
        const oModel = this.getModel();
        var butterflies = oModel.getProperty("/butterflies");

        // Calculate the sum of the selected column
        var sum = 0;
        butterflies.forEach((butterfly) => {
          if (typeof butterfly[sSelectedKey] == "string") {
            sum = "-------------";
            return;
          }
          sum += butterfly[sSelectedKey];
        });

        // Update the UI
        this.byId("summedValueText").setText(sum);
      },

      /**
       * Opens the dialog for editing column values.
       * @public
       */
      onEditValueDialog: function () {
        // Create dialog lazily
        this.Dialog("oEVDialog", "ui5.butterflies.view.EditValueDialog");
      },

      /**
       * Handles the change event in the edit dialog, updating the selected key.
       * @param {sap.ui.base.Event} oEvent - The event object triggered by the dropdown change.
       * @public
       */
      onEditDialogChange: function (oEvent) {
        this.selectedEditKey = oEvent.getSource().getSelectedKey();
      },

      /**
       * Confirms the editing of selected values in the dialog.
       * @public
       */
      onEditDialogConfirm: function () {
        // Get the model and the data
        const oModel = this.getModel();
        var butterflies = oModel.getProperty("/butterflies");
        var sSelectedKey = this.selectedEditKey;

        butterflies.forEach((butterfly) => {
          if (typeof butterfly[sSelectedKey] == "string") {
            butterfly[sSelectedKey] += "ed";
          } else if (typeof butterfly[sSelectedKey] == "number") {
            butterfly[sSelectedKey] *= 3.3;
          }
        });

        this._closeDialog();
      },

      /**
       * Opens the dialog for creating a new row.
       * @public
       */
      onCreateDialog: function () {
        // Create the dialog
        this.ConfirmationPopUp(
          "addConfirmationTitle",
          "addConfirmationText",
          () => this.onCreate()
        );
      },

      /**
       * Creates a new empty row in the table.
       * @public
       */
      onCreate: function () {
        this._setBusy(true);

        const oModel = this.getModel();
        var butterflies = oModel.getProperty("/butterflies");

        // use unshift to add the copied rows to the beginning of the array
        butterflies.unshift({});

        oModel.setProperty("/butterflies", butterflies);

        this._setBusy(false);

        MessageToast.show(this.textTranslation("createRowSuccess"));
      },

      /**
       * Opens the dialog for deleting selected rows.
       * @public
       */
      onDeleteDialog: function () {
        // Create the dialog
        this.ConfirmationPopUp(
          "deleteConfirmationTitle",
          "deleteConfirmationText",
          () => this.onDelete()
        );
      },

      /**
       * Deletes the selected rows from the table.
       * @public
       */
      onDelete: function () {
        this._setBusy(true);

        const oTable = this.byId("butterflies-table");

        // Get the selected indices (rows)
        var aSelectedIndices = oTable.getSelectedIndices();

        // If no rows are selected, show a message and return
        if (aSelectedIndices.length === 0) {
          MessageToast.show(this.textTranslation("notEnoughRowsSelected"));
          this._setBusy(false);
          return;
        }

        var oModel = this.getModel();
        var aData = oModel.getProperty("/butterflies");

        // Loop through the selected indices and remove the data from the array
        for (var i = aSelectedIndices.length - 1; i >= 0; i--) {
          aData.splice(aSelectedIndices[i], 1);
        }

        oModel.setProperty("/butterflies", aData);

        this._setBusy(false);
        MessageToast.show(this.textTranslation("deleteRowsSuccess"));
      },

      /**
       * Opens the dialog for copying selected rows.
       * @public
       */
      onCopyDialog: function () {
        // Create the dialog
        this.ConfirmationPopUp(
          "copyConfirmationTitle",
          "copyConfirmationText",
          () => this.onCopy()
        );
      },

      /**
       * Copies the selected rows in the table.
       * @public
       */
      onCopy: function () {
        this._setBusy(true);
        const oTable = this.byId("butterflies-table");

        // Get the selected indices (rows)
        var aSelectedIndices = oTable.getSelectedIndices();

        // If no rows are selected, show a message and return
        if (aSelectedIndices.length === 0) {
          MessageToast.show(this.textTranslation("notEnoughRowsSelected"));
          this._setBusy(false);
          return;
        }

        var oModel = this.getModel();
        var aData = oModel.getProperty("/butterflies");

        // Loop through the selected indices and remove the data from the array
        aSelectedIndices.forEach((selectedIndex, idx) => {
          // use unshift to add the copied rows to the beginning of the array
          aData.unshift(aData[selectedIndex + idx]);
        });

        oModel.setProperty("/butterflies", aData);

        this._setBusy(false);
        MessageToast.show(this.textTranslation("copyRowsSuccess"));
      },

      /**
       * Opens a dialog fragment lazily.
       * @param {string} dialogInstanceName - The name of the dialog instance.
       * @param {string} fragment - The fragment name to load.
       * @public
       */
      Dialog: function (dialogInstanceName, fragment) {
        this._setBusy(true);

        // Create dialog lazily
        if (!this.dialogInstanceName) {
          this.dialogInstanceName = this.loadFragment({
            name: fragment,
          });
        }

        this.dialogInstanceName.then(
          function (oDialog) {
            this.oDialog = oDialog;
            this.oDialog.open();
          }.bind(this)
        );
      },

      /**
       * Closes the currently opened dialog.
       * @private
       */
      _closeDialog: function () {
        // Close the dialog
        this.oDialog.close();
        this._setBusy(false);
      },

      /**
       * Opens a confirmation dialog with a callback on OK.
       * @param {string} title - The title key for the dialog.
       * @param {string} content - The content key for the dialog.
       * @param {Function} callback - The callback function to execute on confirmation.
       * @public
       */
      ConfirmationPopUp: function (title, content, callback) {
        // Create the dialog
        MessageBox.confirm(this.textTranslation(content), {
          title: this.textTranslation(title),
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.OK) {
              callback();
            }
          },
        });
      },

      /**
       * Sets the busy state of the app.
       * @param {boolean} bIsBusy - The busy state to set.
       * @private
       */
      _setBusy: function (bIsBusy) {
        var oModel = this.getModel("appView");
        oModel.setProperty("/busy", bIsBusy);
      },

      /**
       * Retrieves a translated text from the i18n model based on a key.
       * @param {string} sText - The key for the text in the i18n model.
       * @returns {string} The translated text.
       * @public
       */
      textTranslation: function (sText) {
        const oResourceBundle = this.getResourceBundle();
        return oResourceBundle.getText(sText);
      },
    });
  }
);
