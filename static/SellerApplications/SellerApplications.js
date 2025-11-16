document.addEventListener("DOMContentLoaded", async () => {
    const form = document.querySelector("form");
    const regionSelect = document.getElementById("region");
    const provinceSelect = document.getElementById("province");
    const citySelect = document.getElementById("city");
    const barangaySelect = document.getElementById("barangay");

    // Hidden inputs for readable names
    const regionNameInput = createHiddenInput("region_name");
    const provinceNameInput = createHiddenInput("province_name");
    const cityNameInput = createHiddenInput("city_name");
    const barangayNameInput = createHiddenInput("barangay_name");

    form.append(regionNameInput, provinceNameInput, cityNameInput, barangayNameInput);

    // Load JSON data
    const regions = await fetch("/static/philippine-addresses/region.json").then(r => r.json());
    const provinces = await fetch("/static/philippine-addresses/province.json").then(r => r.json());
    const cities = await fetch("/static/philippine-addresses/city.json").then(r => r.json());
    const barangays = await fetch("/static/philippine-addresses/barangay.json").then(r => r.json());

    populateSelect(regionSelect, regions, "region_code", "region_name");

    // --- Cascading Selections ---
    regionSelect.addEventListener("change", () => {
        const regionCode = regionSelect.value;
        const region = regions.find(r => r.region_code === regionCode);
        regionNameInput.value = region ? region.region_name : "";

        resetSelects(provinceSelect, citySelect, barangaySelect);

        const filteredProvinces = provinces.filter(p => p.region_code === regionCode);
        populateSelect(provinceSelect, filteredProvinces, "province_code", "province_name");
    });

    provinceSelect.addEventListener("change", () => {
        const provinceCode = provinceSelect.value;
        const province = provinces.find(p => p.province_code === provinceCode);
        provinceNameInput.value = province ? province.province_name : "";

        resetSelects(citySelect, barangaySelect);

        const filteredCities = cities.filter(c => c.province_code === provinceCode);
        populateSelect(citySelect, filteredCities, "city_code", "city_name");
    });

    citySelect.addEventListener("change", () => {
        const cityCode = citySelect.value;
        const city = cities.find(c => c.city_code === cityCode);
        cityNameInput.value = city ? city.city_name : "";

        resetSelects(barangaySelect);

        const filteredBarangays = barangays.filter(b => b.city_code === cityCode);
        populateSelect(barangaySelect, filteredBarangays, "brgy_code", "brgy_name");
    });

    barangaySelect.addEventListener("change", () => {
        const brgyCode = barangaySelect.value;
        const barangay = barangays.find(b => b.brgy_code === brgyCode);
        barangayNameInput.value = barangay ? barangay.brgy_name : "";
    });

    // --- File Validation (SweetAlert2) ---
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    ["valid_id", "document"].forEach(id => {
        document.getElementById(id).addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File Type',
                    text: 'Only PDF, JPG, or PNG files are allowed.',
                    confirmButtonColor: '#3085d6'
                });
                e.target.value = '';
            } else if (file.size > maxFileSize) {
                Swal.fire({
                    icon: 'error',
                    title: 'File Too Large',
                    text: 'File size must be 5MB or less.',
                    confirmButtonColor: '#3085d6'
                });
                e.target.value = '';
            }
        });
    });

    // --- Form Submission ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Make sure hidden name inputs are updated one last time
        updateAddressNames();

        // Submit the form via SweetAlert confirmation
        Swal.fire({
            icon: 'success',
            title: 'Application Submitted!',
            text: 'Your seller application has been received.',
            confirmButtonColor: '#3085d6'
        }).then(() => form.submit());
    });

    // --- Helper Functions ---
    function createHiddenInput(name) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        return input;
    }

    function populateSelect(select, items, valueKey, textKey) {
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = item[valueKey];
            option.textContent = item[textKey];
            select.appendChild(option);
        });
    }

    function resetSelects(...selects) {
        selects.forEach(s => s.innerHTML = `<option disabled selected>Select ${s.id.charAt(0).toUpperCase() + s.id.slice(1)}</option>`);
    }

    function updateAddressNames() {
        // Make sure all hidden inputs match the selected visible options
        regionNameInput.value = regionSelect.selectedOptions[0]?.textContent || "";
        provinceNameInput.value = provinceSelect.selectedOptions[0]?.textContent || "";
        cityNameInput.value = citySelect.selectedOptions[0]?.textContent || "";
        barangayNameInput.value = barangaySelect.selectedOptions[0]?.textContent || "";
    }
});
