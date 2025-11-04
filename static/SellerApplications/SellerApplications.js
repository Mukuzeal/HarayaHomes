document.addEventListener("DOMContentLoaded", async () => {
    const regionSelect = document.getElementById("region");
    const provinceSelect = document.getElementById("province");
    const citySelect = document.getElementById("city");
    const barangaySelect = document.getElementById("barangay");
    const form = document.querySelector("form");

    // Create hidden inputs to store human-readable names
    const regionNameInput = document.createElement("input");
    regionNameInput.type = "hidden";
    regionNameInput.name = "region_name";
    form.appendChild(regionNameInput);

    const provinceNameInput = document.createElement("input");
    provinceNameInput.type = "hidden";
    provinceNameInput.name = "province_name";
    form.appendChild(provinceNameInput);

    const cityNameInput = document.createElement("input");
    cityNameInput.type = "hidden";
    cityNameInput.name = "city_name";
    form.appendChild(cityNameInput);

    const barangayNameInput = document.createElement("input");
    barangayNameInput.type = "hidden";
    barangayNameInput.name = "barangay_name";
    form.appendChild(barangayNameInput);

    // Fetch address data
    const regions = await fetch("/static/philippine-addresses/region.json").then(r => r.json());
    const provinces = await fetch("/static/philippine-addresses/province.json").then(r => r.json());
    const cities = await fetch("/static/philippine-addresses/city.json").then(r => r.json());
    const barangays = await fetch("/static/philippine-addresses/barangay.json").then(r => r.json());

    // Load Regions
    regionSelect.innerHTML = '<option disabled selected>Select Region</option>';
    regions.forEach(region => {
        const option = document.createElement("option");
        option.value = region.region_code;
        option.textContent = region.region_name;
        regionSelect.appendChild(option);
    });

    // Region → Province
    regionSelect.addEventListener("change", () => {
        const selectedRegion = regionSelect.value;
        regionNameInput.value = regions.find(r => r.region_code === selectedRegion)?.region_name || "";
        provinceSelect.innerHTML = '<option disabled selected>Select Province</option>';
        citySelect.innerHTML = '<option disabled selected>Select City</option>';
        barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

        const filteredProvinces = provinces.filter(p => p.region_code === selectedRegion);
        filteredProvinces.forEach(province => {
            const option = document.createElement("option");
            option.value = province.province_code;
            option.textContent = province.province_name;
            provinceSelect.appendChild(option);
        });
    });

    // Province → City
    provinceSelect.addEventListener("change", () => {
        const selectedProvince = provinceSelect.value;
        provinceNameInput.value = provinces.find(p => p.province_code === selectedProvince)?.province_name || "";
        citySelect.innerHTML = '<option disabled selected>Select City</option>';
        barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

        const filteredCities = cities.filter(c => c.province_code === selectedProvince);
        filteredCities.forEach(city => {
            const option = document.createElement("option");
            option.value = city.city_code;
            option.textContent = city.city_name;
            citySelect.appendChild(option);
        });
    });

    // City → Barangay
    citySelect.addEventListener("change", () => {
        const selectedCity = citySelect.value;
        cityNameInput.value = cities.find(c => c.city_code === selectedCity)?.city_name || "";
        barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

        const filteredBarangays = barangays.filter(b => b.city_code === selectedCity);
        filteredBarangays.forEach(barangay => {
            const option = document.createElement("option");
            option.value = barangay.brgy_code;
            option.textContent = barangay.brgy_name;
            barangaySelect.appendChild(option);
        });
    });

    barangaySelect.addEventListener("change", () => {
        const selectedBarangay = barangaySelect.value;
        barangayNameInput.value = barangays.find(b => b.brgy_code === selectedBarangay)?.brgy_name || "";
    });

    // ✅ Before submission, use names instead of numeric codes
    form.addEventListener("submit", () => {
        // Replace select name attributes with readable name equivalents
        regionSelect.name = "region_code";
        provinceSelect.name = "province_code";
        citySelect.name = "city_code";
        barangaySelect.name = "barangay_code";
    });
});




const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

document.getElementById('valid_id').addEventListener('change', validateFile);
document.getElementById('document').addEventListener('change', validateFile);

function validateFile(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size
        if (file.size > maxFileSize) {
            alert('File size must be 5MB or less.');
            event.target.value = ''; // Clear file input
        }

        // Check file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only PDF, JPG, or PNG allowed.');
            event.target.value = '';
        }
    }
}