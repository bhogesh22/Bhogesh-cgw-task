// displayURLParams.js
import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getOrderWithDynamicFields from '@salesforce/apex/DynamicInvoiceController.getOrderWithDynamicFields';
import createInvoiceAndLineItems from '@salesforce/apex/InvoiceController.createInvoiceAndLineItems';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DisplayURLParams extends NavigationMixin(LightningElement) {
    @track invoiceData;
    @track isLoading = true;
    @track error;
    @track jsonData;
    urlParams = {};
    
    columns = [
        { label: 'Description', fieldName: 'description', type: 'text' },
        { label: 'Quantity', fieldName: 'quantity', type: 'number' },
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency' },
        { label: 'Total', fieldName: 'total', type: 'currency' }
    ];

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference && currentPageReference.state) {
            console.log('Current Page Reference:', JSON.stringify(currentPageReference.state));
            
            const orderId = currentPageReference.state.c__originRecord || 
                           currentPageReference.state.originRecord ||
                           currentPageReference.state.c__origin_record || 
                           currentPageReference.state.origin_record;
            
            this.urlParams = {
                originRecord: orderId,
                account: currentPageReference.state.account,
                invoiceDate: currentPageReference.state.invoice_date,
                invoiceDueDate: currentPageReference.state.invoice_due_date,
                childRelationshipName: currentPageReference.state.child_relationship_name,
                lineItemDescription: currentPageReference.state.line_item_description,
                lineItemQuantity: currentPageReference.state.line_item_quantity,
                lineItemUnitPrice: currentPageReference.state.line_item_unit_price
            };
            
            if (this.urlParams.originRecord) {
                this.loadOrderDetails();
            } else {
                this.error = 'No Order ID found in URL parameters';
                this.isLoading = false;
                this.showToast('Error', this.error, 'error');
            }
        }
    }

    async loadOrderDetails() {
        try {
            this.isLoading = true;
            this.error = null;
            
            const result = await getOrderWithDynamicFields({ 
                orderId: this.urlParams.originRecord,
                accountField: this.urlParams.account,
                invoiceDateField: this.urlParams.invoiceDate,
                invoiceDueDateField: this.urlParams.invoiceDueDate,
                childRelationshipName: this.urlParams.childRelationshipName,
                descriptionField: this.urlParams.lineItemDescription,
                quantityField: this.urlParams.lineItemQuantity,
                unitPriceField: this.urlParams.lineItemUnitPrice
            });
            
            if (result) {
                this.invoiceData = {
                    accountName: result.accountName,
                    invoiceDate: result.invoiceDate,
                    invoiceDueDate: result.invoiceDueDate,
                    lineItems: result.lineItems?.map(item => ({
                        id: item.Id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.quantity * item.unitPrice
                    })) || []
                };
            }
        } catch (error) {
            this.error = error.message || 'Unknown error occurred';
            this.showToast('Error', this.error, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    generateJSON() {
        try {
            const xeroInvoice = {
                "Invoice": {
                    "Type": "ACCREC",
                    "Contact": {
                        "ContactID": "0000000",
                        "Name": this.invoiceData.accountName
                    },
                    "Date": this.formatDate(this.invoiceData.invoiceDate),
                    "DueDate": this.formatDate(this.invoiceData.invoiceDueDate),
                    "LineItems": this.invoiceData.lineItems.map(item => ({
                        "Description": item.description,
                        "Quantity": item.quantity,
                        "UnitAmount": item.unitPrice,
                        "AccountCode": "200",
                        "LineAmount": item.total
                    }))
                }
            };
            this.jsonData = JSON.stringify(xeroInvoice, null, 2);
        } catch (error) {
            this.showToast('Error', 'Error generating JSON: ' + error.message, 'error');
        }
    }

    async proceedToCreateInvoice() {
        try {
            this.isLoading = true;
            const invoiceDetails = {
                accountId: this.urlParams.account,
                invoiceDate: this.formatDate(this.invoiceData.invoiceDate),
                dueDate: this.formatDate(this.invoiceData.invoiceDueDate),
                lineItems: this.invoiceData.lineItems.map(item => ({
                    description: item.description,
                    quantity: String(item.quantity),
                    unitPrice: String(item.unitPrice)
                }))
            };

            const invoiceId = await createInvoiceAndLineItems({ invoiceDetails });
            
            this.showToast('Success', 'Invoice created successfully', 'success');
            
            // Navigate to the new invoice record
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: invoiceId,
                    objectApiName: 'Invoice__c',
                    actionName: 'view'
                }
            });
        } catch (error) {
            this.error = error.message || 'Error creating invoice';
            this.showToast('Error', this.error, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    formatDate(date) {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
            }),
        );
    }

    get formattedInvoiceDate() {
        return this.invoiceData?.invoiceDate ? new Date(this.invoiceData.invoiceDate).toLocaleDateString() : '';
    }

    get formattedDueDate() {
        return this.invoiceData?.invoiceDueDate ? new Date(this.invoiceData.invoiceDueDate).toLocaleDateString() : '';
    }
}
