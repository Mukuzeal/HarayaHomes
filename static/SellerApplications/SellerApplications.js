document.addEventListener("DOMContentLoaded", async() => {
    const regionSelect = document.getElementById("region");
    const provinceSelect = document.getElementById("province");
    const citySelect = document.getElementById("city");
    const barangaySelect = document.getElementById("barangay");

    // Fetch JSON data from static folder
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
        barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

        const filteredBarangays = barangays.filter(b => b.city_code === selectedCity);
        filteredBarangays.forEach(barangay => {
            const option = document.createElement("option");
            option.value = barangay.brgy_code;
            option.textContent = barangay.brgy_name;
            barangaySelect.appendChild(option);
        });
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