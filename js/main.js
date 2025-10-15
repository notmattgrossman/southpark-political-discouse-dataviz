/**
 * South Park Political Themes - Categorized Theme River Visualization
 * Uses D3.js v7 with proper margin convention and streamgraph layout
 * Fully responsive to window resize
 */

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

// Global data storage
let globalData = null;

// Responsive dimension calculator
function getResponsiveDimensions() {
  const containerWidth = document.getElementById('viz').clientWidth;
  const containerHeight = Math.max(500, window.innerHeight - 100);
  
  // Responsive margins
  const margin = {
    top: containerWidth < 768 ? 80 : 100,
    right: containerWidth <= 1000 ? 40 : 280, // Less right margin when legend is below
    bottom: containerWidth <= 1000 ? (containerWidth <= 800 ? 450 : 300) : (containerWidth < 768 ? 50 : 60), // More bottom margin for legend below; extra for 2-column layout
    left: containerWidth < 768 ? 70 : 60 // Extra left margin at small screens for Y-axis label
  };
  
  const width = containerWidth - margin.left - margin.right - 40; // 40 for padding
  // Ensure height is sufficient for the full legend (needs ~800px minimum with spacing)
  const height = Math.max(800, Math.min(containerHeight, 1100)) - margin.top - margin.bottom;
  
  return { margin, width, height };
}

// Theme categories with their respective themes
const themeCategories = {
  domestic: {
    name: 'Domestic Policy',
    color: 'Blues',
    themes: [
      'Healthcare Reform',
      'Immigration',
      'Gun Control',
      'Climate Change',
      'Abortion',
      'LGBTQ Rights',
      'Criminal Justice Reform',
      'Education Reform'
    ]
  },
  foreign: {
    name: 'Foreign/Security',
    color: 'Reds',
    themes: [
      'Terrorism',
      'Iraq Afghanistan Wars',
      'Trade Policy',
      'Russia',
      'Middle East Conflict'
    ]
  },
  economic: {
    name: 'Economic',
    color: 'Greens',
    themes: [
      'Income Inequality',
      'Unemployment Jobs',
      'Inflation Cost of Living',
      'Minimum Wage Labor',
      'Tax Policy',
      'Social Security Medicare'
    ]
  },
  cultural: {
    name: 'Social/Cultural',
    color: 'Purples',
    themes: [
      'Race Civil Rights',
      'Cancel Culture Free Speech',
      'Drug Policy',
      'Voting Rights Election Security',
      'Technology Privacy'
    ]
  }
};

// Color interpolation functions
const colorSchemes = {
  Blues: t => d3.interpolateBlues(0.4 + t * 0.45),
  Reds: t => d3.interpolateReds(0.4 + t * 0.45),
  Greens: t => d3.interpolateGreens(0.35 + t * 0.5),
  Purples: t => d3.interpolatePuRd(0.35 + t * 0.5)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function to limit resize event firing
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a color mapping for all themes based on their categories
 */
function createColorMapping() {
  const colorMap = new Map();
  
  Object.entries(themeCategories).forEach(([_, category]) => {
    const numThemes = category.themes.length;
    category.themes.forEach((theme, i) => {
      const t = numThemes > 1 ? i / (numThemes - 1) : 0.5;
      colorMap.set(theme, colorSchemes[category.color](t));
    });
  });
  
  return colorMap;
}

/**
 * Aggregates CSV data by year and theme
 */
function aggregateData(rawData) {
  const aggregated = d3.rollup(
    rawData,
    v => d3.sum(v, d => d.count),
    d => d.year,
    d => d.theme
  );
  
  // Convert to array of objects with year and theme counts
  const years = Array.from(new Set(rawData.map(d => d.year))).sort();
  const themes = Array.from(new Set(rawData.map(d => d.theme)));
  
  return years.map(year => {
    const yearData = { year };
    themes.forEach(theme => {
      yearData[theme] = aggregated.get(year)?.get(theme) || 0;
    });
    return yearData;
  });
}

/**
 * Gets ordered list of themes by category
 */
function getOrderedThemes() {
  return Object.values(themeCategories).flatMap(cat => cat.themes);
}

// ============================================================================
// CHART CREATION
// ============================================================================

/**
 * Creates the main SVG container with margin convention
 */
function createSvgContainer(width, height, margin) {
  // Clear existing SVG
  d3.select('#viz').selectAll('svg').remove();
  
  const svg = d3.select('#viz')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  return { svg, g };
}

/**
 * Creates scales for the visualization
 */
function createScales(data, width, height) {
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .range([height, 0]);
  
  return { xScale, yScale };
}

/**
 * Creates and renders axes
 */
function createAxes(g, xScale, yScale, width, height) {
  // Responsive tick count
  const tickCount = width < 600 ? 10 : 20;
  
  // X-axis
  const xAxis = d3.axisBottom(xScale)
    .ticks(tickCount)
    .tickFormat(d3.format('d'));
  
  g.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);
  
  // X-axis label
  g.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .text('Year');
  
  // Y-axis label
  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Theme Activity');
  
  // Grid lines
  g.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(xScale.ticks(tickCount))
    .join('line')
    .attr('class', 'grid-line')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', 0)
    .attr('y2', height);
}

/**
 * Creates the chart title and subtitle
 */
function createTitle(g, width) {
  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', -60)
    .attr('text-anchor', 'middle')
    .text('South Park\'s Political Themes over Time');
  
  // Responsive subtitle
  const subtitle = width < 768 
    ? 'Political Discourse and Satire'
    : 'Political Discourse and Satire in Comedy Central\'s South Park';
  
  g.append('text')
    .attr('class', 'chart-subtitle')
    .attr('x', width / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .text(subtitle);
}

/**
 * Creates a legend - vertical on right side for wide screens, 4-column below for narrow screens
 */
function createLegend(g, colorMap, width, height) {
  const containerWidth = document.getElementById('viz').clientWidth;
  const isNarrow = containerWidth <= 1000;
  
  const rectSize = 14;
  const fontSize = 11;
  const lineHeight = 20;
  const categorySpacing = 30;
  
  // Helper function to sanitize theme names for use as CSS classes
  const sanitizeThemeName = (theme) => theme.replace(/\s+/g, '-').replace(/\//g, '-');
  
  if (isNarrow) {
    // Layout below the chart: 4 columns above 800px, 2 columns at 800px and below
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0, ${height + 100})`);
    
    const categories = Object.entries(themeCategories);
    const isTwoColumn = containerWidth <= 800;
    const numColumns = isTwoColumn ? 2 : 4;
    const columnWidth = width / numColumns;
    
    if (isTwoColumn) {
      // 2-column layout: stack 2 categories per column
      let currentColumn = 0;
      let currentYOffset = 0;
      
      categories.forEach(([key, category], categoryIndex) => {
        currentColumn = categoryIndex % 2;
        const baseYOffset = categoryIndex < 2 ? 0 : currentYOffset + categorySpacing;
        
        const columnGroup = legend.append('g')
          .attr('transform', `translate(${currentColumn * columnWidth}, ${baseYOffset})`);
        
        // Category label
        columnGroup.append('text')
          .attr('class', 'legend-category')
          .attr('x', 0)
          .attr('y', 0)
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .text(category.name);
        
        let yOffset = lineHeight;
        
        // Theme items
        category.themes.forEach(theme => {
          const themeClass = sanitizeThemeName(theme);
          
          const legendItem = columnGroup.append('g')
            .attr('class', `legend-item legend-item-${themeClass}`)
            .attr('data-theme', theme)
            .attr('transform', `translate(0, ${yOffset})`)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
              d3.select(this).select('rect')
                .attr('stroke', '#333')
                .attr('stroke-width', 2);
              d3.select(this).select('text')
                .style('font-weight', 'bold');
              
              d3.selectAll('.theme-path')
                .attr('opacity', d => d.key === theme ? 1 : 0.15)
                .attr('stroke', d => d.key === theme ? '#333' : 'none')
                .attr('stroke-width', d => d.key === theme ? 2 : 0);
            })
            .on('mouseout', function() {
              d3.select(this).select('rect')
                .attr('stroke', 'none');
              d3.select(this).select('text')
                .style('font-weight', 'normal');
              
              d3.selectAll('.theme-path')
                .attr('opacity', 0.85)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);
            });
          
          legendItem.append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('fill', colorMap.get(theme))
            .attr('opacity', 0.85)
            .attr('stroke', 'none');
          
          legendItem.append('text')
            .attr('class', 'legend-text')
            .attr('x', rectSize + 6)
            .attr('y', rectSize - 3)
            .style('font-size', `${fontSize}px`)
            .text(theme);
          
          yOffset += lineHeight;
        });
        
        // Track the max height for proper vertical spacing
        if (categoryIndex === 0 || categoryIndex === 1) {
          currentYOffset = Math.max(currentYOffset, yOffset);
        }
      });
    } else {
      // 4-column layout (original)
      categories.forEach(([key, category], columnIndex) => {
        const columnGroup = legend.append('g')
          .attr('transform', `translate(${columnIndex * columnWidth}, 0)`);
        
        // Category label
        columnGroup.append('text')
          .attr('class', 'legend-category')
          .attr('x', 0)
          .attr('y', 0)
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .text(category.name);
        
        let yOffset = lineHeight;
        
        // Theme items
        category.themes.forEach(theme => {
          const themeClass = sanitizeThemeName(theme);
          
          const legendItem = columnGroup.append('g')
            .attr('class', `legend-item legend-item-${themeClass}`)
            .attr('data-theme', theme)
            .attr('transform', `translate(0, ${yOffset})`)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
              d3.select(this).select('rect')
                .attr('stroke', '#333')
                .attr('stroke-width', 2);
              d3.select(this).select('text')
                .style('font-weight', 'bold');
              
              d3.selectAll('.theme-path')
                .attr('opacity', d => d.key === theme ? 1 : 0.15)
                .attr('stroke', d => d.key === theme ? '#333' : 'none')
                .attr('stroke-width', d => d.key === theme ? 2 : 0);
            })
            .on('mouseout', function() {
              d3.select(this).select('rect')
                .attr('stroke', 'none');
              d3.select(this).select('text')
                .style('font-weight', 'normal');
              
              d3.selectAll('.theme-path')
                .attr('opacity', 0.85)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);
            });
          
          legendItem.append('rect')
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('fill', colorMap.get(theme))
            .attr('opacity', 0.85)
            .attr('stroke', 'none');
          
          legendItem.append('text')
            .attr('class', 'legend-text')
            .attr('x', rectSize + 6)
            .attr('y', rectSize - 3)
            .style('font-size', `${fontSize}px`)
            .text(theme);
          
          yOffset += lineHeight;
        });
      });
    }
  } else {
    // Vertical layout on the right side (original layout for wide screens)
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 50}, 0)`);
    
    let yOffset = 0;
    
    Object.entries(themeCategories).forEach(([key, category]) => {
      // Category label
      legend.append('text')
        .attr('class', 'legend-category')
        .attr('x', 0)
        .attr('y', yOffset)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(category.name);
      
      yOffset += lineHeight - 5;
      
      // Theme items
      category.themes.forEach(theme => {
        const themeClass = sanitizeThemeName(theme);
        
        const legendItem = legend.append('g')
          .attr('class', `legend-item legend-item-${themeClass}`)
          .attr('data-theme', theme)
          .attr('transform', `translate(0, ${yOffset})`)
          .style('cursor', 'pointer')
          .on('mouseover', function() {
            d3.select(this).select('rect')
              .attr('stroke', '#333')
              .attr('stroke-width', 2);
            d3.select(this).select('text')
              .style('font-weight', 'bold');
            
            d3.selectAll('.theme-path')
              .attr('opacity', d => d.key === theme ? 1 : 0.15)
              .attr('stroke', d => d.key === theme ? '#333' : 'none')
              .attr('stroke-width', d => d.key === theme ? 2 : 0);
          })
          .on('mouseout', function() {
            d3.select(this).select('rect')
              .attr('stroke', 'none');
            d3.select(this).select('text')
              .style('font-weight', 'normal');
            
            d3.selectAll('.theme-path')
              .attr('opacity', 0.85)
              .attr('stroke', 'none')
              .attr('stroke-width', 0);
          });
        
        legendItem.append('rect')
          .attr('width', rectSize)
          .attr('height', rectSize)
          .attr('fill', colorMap.get(theme))
          .attr('opacity', 0.85)
          .attr('stroke', 'none');
        
        legendItem.append('text')
          .attr('class', 'legend-text')
          .attr('x', rectSize + 6)
          .attr('y', rectSize - 3)
          .style('font-size', `${fontSize}px`)
          .text(theme);
        
        yOffset += lineHeight;
      });
      
      yOffset += categorySpacing;
    });
  }
}

/**
 * Creates tooltip element
 */
function createTooltip() {
  // Remove existing tooltip if any
  d3.select('.tooltip').remove();
  
  return d3.select('body')
    .append('div')
    .attr('class', 'tooltip');
}

/**
 * Creates the streamgraph
 */
function createStreamgraph(g, data, xScale, colorMap, tooltip, width, height) {
  const orderedThemes = getOrderedThemes();
  const themesInData = orderedThemes.filter(theme => 
    data.some(d => d[theme] > 0)
  );
  
  // Create stack layout with wiggle offset
  const stack = d3.stack()
    .keys(themesInData)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetWiggle);
  
  const series = stack(data);
  
  // Update y-scale domain based on stacked data
  const yExtent = [
    d3.min(series, s => d3.min(s, d => d[0])),
    d3.max(series, s => d3.max(s, d => d[1]))
  ];
  const yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([height, 0]);
  
  // Create area generator
  const area = d3.area()
    .x(d => xScale(d.data.year))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveBasis);
  
  // Helper function to sanitize theme names
  const sanitizeThemeName = (theme) => theme.replace(/\s+/g, '-').replace(/\//g, '-');
  
  // Create paths for each theme
  const paths = g.append('g')
    .attr('class', 'streamgraph')
    .selectAll('path')
    .data(series)
    .join('path')
    .attr('class', 'theme-path')
    .attr('d', area)
    .attr('fill', d => colorMap.get(d.key))
    .attr('opacity', 0.85)
    .on('mouseover', function(event, d) {
      const themeName = d.key;
      const themeClass = sanitizeThemeName(themeName);
      
      // Highlight current path
      d3.selectAll('.theme-path')
        .attr('opacity', 0.15);
      d3.select(this)
        .attr('opacity', 1);
      
      // Highlight corresponding legend item
      d3.selectAll(`.legend-item-${themeClass}`)
        .select('rect')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
      d3.selectAll(`.legend-item-${themeClass}`)
        .select('text')
        .style('font-weight', 'bold');
      
      // Show tooltip
      tooltip
        .style('opacity', 1)
        .html(`<strong>${themeName}</strong>`);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      // Reset opacity
      d3.selectAll('.theme-path')
        .attr('opacity', 0.85);
      
      // Reset all legend items
      d3.selectAll('.legend-item rect')
        .attr('stroke', 'none');
      d3.selectAll('.legend-item text')
        .style('font-weight', 'normal');
      
      // Hide tooltip
      tooltip.style('opacity', 0);
    });
  
  return { paths, yScale };
}

// ============================================================================
// MAIN RENDER AND INITIALIZATION
// ============================================================================

/**
 * Renders the complete visualization
 */
function render(data) {
  if (!data) return;
  
  // Get responsive dimensions
  const { margin, width, height } = getResponsiveDimensions();
  
  // Create color mapping
  const colorMap = createColorMapping();
  
  // Create SVG container (clears existing)
  const { svg, g } = createSvgContainer(width, height, margin);
  
  // Create scales
  const { xScale, yScale } = createScales(data, width, height);
  
  // Create tooltip
  const tooltip = createTooltip();
  
  // Create streamgraph (this also updates yScale)
  const { yScale: updatedYScale } = createStreamgraph(
    g,
    data,
    xScale,
    colorMap,
    tooltip,
    width,
    height
  );
  
  // Create axes
  createAxes(g, xScale, updatedYScale, width, height);
  
  // Create title
  createTitle(g, width);
  
  // Create legend
  createLegend(g, colorMap, width, height);
  
  console.log('Visualization rendered at', width, 'x', height);
}

/**
 * Main function to initialize and render the visualization
 */
async function init() {
  try {
    // Load data
    const rawData = await d3.csv('data/theme_timeseries_with_year.csv', d => ({
      season: +d.season,
      episode_number: +d.episode_number,
      episode_name: d.episode_name,
      episode_order: +d.episode_order,
      year: +d.year,
      theme: d.theme,
      count: +d.count
    }));
    
    console.log('Data loaded:', rawData.length, 'rows');
    
    // Process data
    globalData = aggregateData(rawData);
    console.log('Aggregated data:', globalData.length, 'years');
    
    // Initial render
    render(globalData);
    
    // Add resize listener with debouncing
    window.addEventListener('resize', debounce(() => {
      console.log('Window resized, re-rendering...');
      render(globalData);
    }, 250));
    
    console.log('Visualization initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing visualization:', error);
    d3.select('#viz')
      .append('div')
      .style('color', 'red')
      .style('padding', '20px')
      .text(`Error loading visualization: ${error.message}`);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
