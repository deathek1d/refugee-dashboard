const csvUrl = 'https://gist.githubusercontent.com/deathek1d/2ac9b53548f6fb1897bb7e305a0555d4/raw/refugee.csv';

const loadingEl = document.getElementById('loading');
const selectEl = document.getElementById('yearselect');
const sliderEl = document.getElementById('refugeeslider');
const sliderValueEl = document.getElementById('slidervalue');
const tooltip = d3.select("#tooltip");

const barChartContainer = d3.select("#barchart");
const treemapContainer = d3.select("#treemap");

let fullData = [];
// parse data convert string to numbers here --->>>>
d3.csv(csvUrl).then(data => {
  data.forEach(d => {
    d.Country = d['Country of Origin'];
    d.Refugees = +d.Refugees;
    d['Asylum Seekers'] = +d['Asylum Seekers'];
    d.Total = d.Refugees + d['Asylum Seekers'];
    d.Year = +d.Year;
  });

  fullData = data;

  const years = Array.from(new Set(data.map(d => d.Year))).sort();
  years.forEach(y => {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    selectEl.appendChild(option);
  });

 // ive to change slider max cause it looks kinda ugly rn 
 // update it stayed ugly 
  const defaultYear = years[years.length - 1];
  selectEl.value = defaultYear;

  const maxTotal = d3.max(data, d => d.Total);
  sliderEl.max = maxTotal;
  sliderEl.min = 0;
  sliderEl.value = 0;
  sliderValueEl.textContent = 0;

  drawVisualizations(+defaultYear);

  selectEl.addEventListener("change", () => {
    drawVisualizations(+selectEl.value);
  });

  sliderEl.addEventListener("input", () => {
    sliderValueEl.textContent = sliderEl.value;
    drawVisualizations(+selectEl.value);
  });

  loadingEl.style.display = "none";
});

function drawVisualizations(selectedYear) {
  const minTotal = +sliderEl.value;
  const barChartData = fullData
    .filter(d => d.Year === selectedYear)
    .sort((a, b) => b.Total - a.Total)
    .slice(0, 30);

  const treemapData = fullData
    .filter(d => d.Year === selectedYear && d.Total >= minTotal);

  drawBarChart(barChartData);
  drawTreemap(treemapData);
  drawLineChart(fullData);
}

function drawBarChart(data) {
  barChartContainer.selectAll("*").remove();

  const margin = { top: 20, right: 20, bottom: 20, left: 200 };
  const width = 800;
  const barHeight = 25;
  const height = data.length * (barHeight + 10) + margin.top + margin.bottom;

  const svg = barChartContainer.append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Total)])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.Country))
    .range([margin.top, height - margin.bottom])
    .padding(0.1);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));


  svg.selectAll(".barrefugees")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "barrefugees")
    .attr("x", x(0))
    .attr("y", d => y(d.Country))
    .attr("height", y.bandwidth())
    .attr("width", d => Math.max(0, x(d.Refugees) - x(0)))
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.Country}</strong><br/>${d.Refugees.toLocaleString()} refugees`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 40}px`);
    })
    .on("mouseout", () => tooltip.style("opacity", 0));


  svg.selectAll(".barasylum")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "barasylum")
    .attr("x", d => x(d.Refugees))
    .attr("y", d => y(d.Country))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d['Asylum Seekers']) - x(0))
    .attr("fill", "orange")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.Country}</strong><br/>${d['Asylum Seekers'].toLocaleString()} asylum seekers`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 40}px`);
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
}

function drawTreemap(data) {
  treemapContainer.selectAll("*").remove();

  const width = 800;
  const height = 500;

  const svg = treemapContainer.append("svg")
    .attr("width", width)
    .attr("height", height);

  const root = d3.hierarchy({ values: data }, d => d.values || d)
    .sum(d => d.Total)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .padding(1)(root)
  /* what does gmma even do, d3.interpolateHslLong('SteelBlue', 'Orange') does the same thing lol */
    const color = d3.scaleSequential()
    .domain([0, d3.max(data, d => d.Total)])
    .interpolator(d3.interpolateHslLong('SteelBlue', 'Orange')); 

  const nodes = svg.selectAll("g")
    .data(root.leaves())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => color(d.data.Total))
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.data.Country}</strong><br/>Total: ${d.data.Total.toLocaleString()}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 40}px`);
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

    nodes.append("text")
    .attr("x", 4)
    .attr("y", 14)
    .text(d => d.data.Country)
    .attr("font-size", "8px")
    .attr("fill", "black")
    .attr("font-weight", "bold")
    .style("display", d => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      return width > 60 && height > 20 ? "block" : "none";});}

function drawLineChart(data) {
        const countries = ["Australia", "Canada", "Italy", "France", "USA"];
        const years = [2023, 2024];
        const filtered = data.filter(d => countries.includes(d["Country of Asylum"]) && years.includes(d.Year));
      
        const nested = d3.groups(filtered, d => d["Country of Asylum"]);
        
        const refugeeLines = nested.map(([country, values]) => ({
          country,
          values: years.map(y => {
            const entry = values.find(d => d.Year === y) || {};
            return { year: y, value: entry.Refugees || 0 };
          })
        }));
      
        const asylumLines = nested.map(([country, values]) => ({
          country,
          values: years.map(y => {
            const entry = values.find(d => d.Year === y) || {};
            return { year: y, value: entry["Asylum Seekers"] || 0 };
          })
        }));
      
        d3.select("#linechart").selectAll("*").remove();
      
        const width = 800, height = 400, margin = { top: 30, right: 150, bottom: 50, left: 60 };
      
        const svg = d3.select("#linechart")
          .append("svg")
          .attr("width", width)
          .attr("height", height);
      
        const x = d3.scaleLinear()
          .domain(d3.extent(years))
          .range([margin.left, width - margin.right]);
      
        const y = d3.scaleLog()
          .domain([1000, d3.max([...refugeeLines, ...asylumLines].flatMap(d => d.values.map(v => v.value)))])
          .base(10)
          .range([height - margin.bottom, margin.top])
          .clamp (true);
      
        const line = d3.line()
          .x(d => x(d.year))
          .y(d => y(d.value));
      
        const color = d3.scaleOrdinal()
          .domain(countries)
          .range(d3.schemeTableau10);
      
      
        refugeeLines.forEach(series => {
          svg.append("path")
            .datum(series.values)
            .attr("fill", "none")
            .attr("stroke", color(series.country))
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2")
            .attr("d", line)
            .attr("opacity", 0.7);
      
          
          svg.selectAll(`.dot-refugee-${series.country}`)
            .data(series.values)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 3)
            .attr("fill", color(series.country))
            .attr("opacity", 0.7);
        });
      
       
        asylumLines.forEach(series => {
          svg.append("path")
            .datum(series.values)
            .attr("fill", "none")
            .attr("stroke", color(series.country))
            .attr("stroke-width", 2)
            .attr("d", line);
      
          svg.selectAll(`.dot-asylum-${series.country}`)
            .data(series.values)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 3)
            .attr("fill", color(series.country));
        });
      
        
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x).ticks(1).tickFormat(d3.format("d")));
      
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y).ticks(25).tickFormat(d3.format(".2s")));
      
        
        const legend = svg.append("g")
          .attr("transform", `translate(${width - margin.right + 40},${margin.top})`);
      
        countries.forEach((c, i) => {
          legend.append("circle")
            .attr("cx", 0)
            .attr("cy", i * 30)
            .attr("r", 5)
            .attr("fill", color(c));
      
          legend.append("text")
            .attr("x", 10)
            .attr("y", i * 30 + 4)
            .text(c)
            .attr("font-size", "12px");
        });
      
        legend.append("line")
          .attr("x1", 0).attr("x2", 20).attr("y1", countries.length * 30 + 10).attr("y2", countries.length * 30 + 10)
          .attr("stroke", "#333").attr("stroke-width", 2);
        legend.append("text")
          .attr("x", 25)
          .attr("y", countries.length * 30 + 14)
          .text("Asylum Seekers")
          .style("font-size", "12px");
      
        legend.append("line")
          .attr("x1", 0).attr("x2", 20).attr("y1", countries.length * 30 + 30).attr("y2", countries.length * 30 + 30)
          .attr("stroke", "#333").attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,2");
        legend.append("text")
          .attr("x", 25)
          .attr("y", countries.length * 30 + 34)
          .text("Refugees")
          .style("font-size", "12px");
      }
          

