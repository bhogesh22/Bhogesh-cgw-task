import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import createInvoiceAndLineItems from '@salesforce/apex/InvoiceController.createInvoiceAndLineItems';


export default class MyComponent extends LightningElement {
    @api originRecord;
    @api account;
    @api invoiceDate;
    @api invoiceDueDate;
    @api childRelationshipName;
    @api lineItemDescription;
    @api lineItemQuantity;
    @api lineItemUnitPrice;
    jsonData;

    @wire(CurrentPageReference) currentPageRef;

    get parameters() {
        return this.currentPageRef ? this.currentPageRef.state : null;
    }

    connectedCallback() {
        if (this.parameters) {
            this.originRecord = this.parameters.c__originRecord;
            this.account = this.parameters.c__account;
            this.invoiceDate = this.parameters.c__invoiceDate;
            this.invoiceDueDate = this.parameters.c__invoiceDueDate;
            this.childRelationshipName = this.parameters.c__childRelationshipName;
            this.lineItemDescription = this.parameters.c__lineItemDescription;
            this.lineItemQuantity = this.parameters.c__lineItemQuantity;
            this.lineItemUnitPrice = this.parameters.c__lineItemUnitPrice;
        }
    }

    generateJSON() {
        const invoiceData = {
            "Invoice": {
                "Type": "ACCREC",
                "Contact": {
                    "Name": "0000001", 
                    "EmailAddress": "example@example.com" 
                },
                "AccountNumber": this.account,
                "Date": this.invoiceDate,
                "DueDate": this.invoiceDueDate,
                "LineItems": [
                    {
                        "Description": this.lineItemDescription,
                        "Quantity": this.lineItemQuantity,
                        "UnitAmount": this.lineItemUnitPrice,
                        "AccountCode": "200" 
                    }
                ]
            }
        };

        this.jsonData = JSON.stringify(invoiceData, null, 2);
    }

    async proceedToCreateInvoice() {
        try {
            console.log('### Preparing Invoice Details...');
            const invoiceDetails = {
                originRecord: this.originRecord,
                accountId: this.account,
                invoiceDate: this.invoiceDate,
                dueDate: this.invoiceDueDate,
                lineItems: [
                    {
                        description: this.lineItemDescription,
                        quantity: this.lineItemQuantity,
                        unitPrice: this.lineItemUnitPrice,
                    },
                ],
            };

            console.log('### Invoice Details:', invoiceDetails);

            // Call Apex method to create Invoice and Line Items
            const invoiceId = await createInvoiceAndLineItems({ invoiceDetails });
            console.log('### Invoice Created with Id:', invoiceId);

            // Navigate to the newly created Invoice record
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: invoiceId,
                    objectApiName: 'Invoice', 
                    actionName: 'view',
                },
            });
        } catch (error) {
            console.error('### Error creating Invoice:', error);
        }
    }
}
