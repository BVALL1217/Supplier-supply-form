// ====================================================================
// --- CRITICAL CONFIGURATION ---
// !!! REPLACE THIS with the URL of your Google Apps Script Deployment (Endpoint) !!!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwgo-9haqVgn7AXCD5iCJlHMtExeCgw6a1dYNxl5afrsTM2TFhH6cinAo-91IPoGL3o-g/exec'; 
// ====================================================================

const form = document.getElementById('supplyForm');
const generateBtn = document.getElementById('generateMatrixBtn');
const matrixBody = document.getElementById('matrixBody');
const resinaCheckboxes = document.querySelectorAll('input[name="resina"]');
const locationCheckboxes = document.querySelectorAll('input[name="location"]');

// Event Listeners
generateBtn.addEventListener('click', generateMatrix);
form.addEventListener('submit', handleFormSubmit);

// Function to generate the dynamic matrix rows based on selections
function generateMatrix() {
    const selectedResinas = Array.from(resinaCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const selectedLocations = Array.from(locationCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Clear any existing rows
    matrixBody.innerHTML = '';

    if (selectedResinas.length === 0 || selectedLocations.length === 0) {
        document.getElementById('matrixMessage').textContent = '⚠️ Please select at least one Resin and one Location.';
        return;
    }
    document.getElementById('matrixMessage').textContent = '';

    // Generate Rows (Cartesian Product / Unique Combinations)
    selectedResinas.forEach(resina => {
        selectedLocations.forEach(location => {
            const rowId = `${resina}-${location}`.replace(/\s/g, '_');
            const newRow = document.createElement('tr');
            newRow.id = rowId;

            newRow.innerHTML = `
                <td>${resina}</td>
                <td>${location}</td>
                <td><input type="number" step="0.01" min="0" 
                    name="qty_cmg_${rowId}" 
                    data-resina="${resina}" 
                    data-location="${location}" 
                    data-unit="CMG" required></td>
                <td><input type="number" step="0.01" min="0" 
                    name="qty_salty_${rowId}" 
                    data-resina="${resina}" 
                    data-location="${location}" 
                    data-unit="Salty" required></td>
            `;
            matrixBody.appendChild(newRow);
        });
    });
}

// Function to handle form submission and send data to Google Sheets via Apps Script
async function handleFormSubmit(event) {
    event.preventDefault(); 
    
    // Disable button during submission and provide feedback
    const submitButton = event.submitter;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending Data... Please Wait.';
    
    // 1. Collect Metadata (Section 1) - Keys must match the Apps Script
    const providerName = document.getElementById('providerName').value;
    const providerEmail = document.getElementById('providerEmail').value;
    
    const formMetadata = {
        'Nombre Proveedor': providerName, // Note: Using Spanish keys to match Apps Script
        'Email Proveedor': providerEmail,
    };

    // 2. Collect Dynamic Matrix Data (Records)
    const matrixInputs = document.querySelectorAll('#dynamicMatrix input[type="number"]');
    const groupedData = {};

    matrixInputs.forEach(input => {
        const resina = input.dataset.resina;
        const location = input.dataset.location;
        const unit = input.dataset.unit;
        // Use 0 if field is empty, although 'required' is set
        const value = input.value || 0; 
        const key = `${resina}|${location}`;

        if (!groupedData[key]) {
            groupedData[key] = {
                Resina: resina,
                Locación: location,
                'Cantidad (Libras) CMG': 0,
                'Cantidad (Libras) Salty': 0
            };
        }

        // Group the quantities based on the unit
        if (unit === 'CMG') {
            groupedData[key]['Cantidad (Libras) CMG'] = value;
        } else if (unit === 'Salty') {
            groupedData[key]['Cantidad (Libras) Salty'] = value;
        }
    });

    const records = Object.values(groupedData);

    // 3. Package data for Apps Script 
    const formData = new FormData();
    formData.append('metadata', JSON.stringify(formMetadata));
    formData.append('records', JSON.stringify(records));

    // 4. Send the data using Fetch API
    try {
        if (SCRIPT_URL === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
            throw new Error("Configuration Error: Please replace 'PASTE_YOUR_APPS_SCRIPT_URL_HERE' in script.js with your deployed Apps Script URL.");
        }

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
             throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
            alert('✅ Form submitted successfully. Data has been saved to your Google Sheet.');
            form.reset(); 
            matrixBody.innerHTML = ''; 
        } else {
            alert(`❌ Error saving data: ${result.message}`);
        }

    } catch (error) {
        console.error('Submission error:', error.message);
        alert(`❌ Error submitting form. Check console for details. Error: ${error.message}`);
    } finally {
        // Re-enable the button
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Form and Send Data';
    }
}
