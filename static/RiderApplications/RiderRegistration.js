document.addEventListener("DOMContentLoaded", async function () {
    const form = document.querySelector("form");
    const pages = document.querySelectorAll(".form-page");
    const nextButtons = document.querySelectorAll(".next-btn");
    const backButtons = document.querySelectorAll(".back-btn");
    const birthdayInput = document.getElementById("birthday");
    const ageInput = document.getElementById("age");

    let currentPage = 0;

    function showPage(index) {
        pages.forEach((page, i) => page.classList.toggle("active", i === index));
        currentPage = index;
    }

    function listInvalidInputs(container) {
        const invalids = [];
        const inputs = container.querySelectorAll("input, select, textarea");
        inputs.forEach((inp) => {
            if (!inp.checkValidity()) invalids.push(inp);
        });
        return invalids;
    }

    // --- Step Navigation ---
    nextButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const activePage = pages[currentPage];
            const invalids = listInvalidInputs(activePage);

            if (invalids.length > 0) {
                invalids[0].reportValidity();
                invalids[0].focus();
                return;
            }

            if (currentPage === pages.length - 1) {
                form.submit();
            } else {
                showPage(currentPage + 1);
            }
        });
    });

    backButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage > 0) showPage(currentPage - 1);
        });
    });

    // --- Age Auto-Calculator ---
    if (birthdayInput && ageInput) {
        birthdayInput.addEventListener("change", function () {
            const birthDate = new Date(this.value);
            if (isNaN(birthDate)) {
                ageInput.value = "";
                return;
            }
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            ageInput.value = age;
        });
    }

    // --- Address Cascading ---
    try {
        const regionSelect = document.getElementById("region");
        const provinceSelect = document.getElementById("province");
        const citySelect = document.getElementById("city");
        const barangaySelect = document.getElementById("barangay");

        const [regions, provinces, cities, barangays] = await Promise.all([
            fetch("/static/philippine-addresses/region.json").then(r => r.json()),
            fetch("/static/philippine-addresses/province.json").then(r => r.json()),
            fetch("/static/philippine-addresses/city.json").then(r => r.json()),
            fetch("/static/philippine-addresses/barangay.json").then(r => r.json()),
        ]);

        // hidden inputs for names
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

        // --- Load Regions ---
        regionSelect.innerHTML = '<option disabled selected>Select Region</option>';
        regions.forEach(region => {
            const opt = document.createElement("option");
            opt.value = region.region_code;
            opt.textContent = region.region_name;
            regionSelect.appendChild(opt);
        });

        // --- Region → Province ---
        regionSelect.addEventListener("change", () => {
            const selectedRegion = regionSelect.value;
            regionNameInput.value = regions.find(r => r.region_code === selectedRegion)?.region_name || "";

            provinceSelect.innerHTML = '<option disabled selected>Select Province</option>';
            citySelect.innerHTML = '<option disabled selected>Select City</option>';
            barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

            const filteredProvinces = provinces.filter(p => p.region_code === selectedRegion);
            filteredProvinces.forEach(province => {
                const opt = document.createElement("option");
                opt.value = province.province_code;
                opt.textContent = province.province_name;
                provinceSelect.appendChild(opt);
            });
        });

        // --- Province → City ---
        provinceSelect.addEventListener("change", () => {
            const selectedProvince = provinceSelect.value;
            provinceNameInput.value = provinces.find(p => p.province_code === selectedProvince)?.province_name || "";

            citySelect.innerHTML = '<option disabled selected>Select City</option>';
            barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';

            const filteredCities = cities.filter(c => c.province_code === selectedProvince);
            filteredCities.forEach(city => {
                const opt = document.createElement("option");
                opt.value = city.city_code;
                opt.textContent = city.city_name;
                citySelect.appendChild(opt);
            });
        });

        // --- City → Barangay ---
        citySelect.addEventListener("change", () => {
            const selectedCity = citySelect.value;
            cityNameInput.value = cities.find(c => c.city_code === selectedCity)?.city_name || "";

            barangaySelect.innerHTML = '<option disabled selected>Select Barangay</option>';
            const filteredBarangays = barangays.filter(b => b.city_code === selectedCity);
            filteredBarangays.forEach(barangay => {
                const opt = document.createElement("option");
                opt.value = barangay.brgy_code;
                opt.textContent = barangay.brgy_name;
                barangaySelect.appendChild(opt);
            });
        });

        barangaySelect.addEventListener("change", () => {
            const selectedBarangay = barangaySelect.value;
            barangayNameInput.value = barangays.find(b => b.brgy_code === selectedBarangay)?.brgy_name || "";
        });

    } catch (err) {
        console.error("Address cascading error:", err);
    }

    // --- Show first page ---
    showPage(currentPage);
});
