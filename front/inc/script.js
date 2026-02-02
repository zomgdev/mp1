document.addEventListener('DOMContentLoaded', function() {
    // Function to create tree nodes
    function createTreeNode(data, parentElement) {
        for (const key in data) {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = key;
            
            if (Array.isArray(data[key]) || typeof data[key] === 'object') {
                li.className = 'folder collapsed';
                const ul = document.createElement('ul');
                ul.style.display = 'none';
                
                if (Array.isArray(data[key])) {
                    data[key].forEach(item => {
                        const childLi = document.createElement('li');
                        childLi.className = 'file';
                        childLi.innerHTML = `<span>${item}</span>`;
                        ul.appendChild(childLi);
                    });
                } else {
                    createTreeNode(data[key], ul);
                }
                
                li.appendChild(span);
                li.appendChild(ul);
            } else {
                li.className = 'file';
                li.appendChild(span);
            }
            
            parentElement.appendChild(li);
        }
    }

    // Fetch tree data from the backend
    fetch('/api/tree')
        .then(response => response.json())
        .then(treeData => {
            // Create the tree
            const treeContainer = document.getElementById('tree');
            createTreeNode(treeData, treeContainer);

            // Add click event listeners for folders
            treeContainer.addEventListener('click', function(e) {
                if (e.target.tagName === 'SPAN' && e.target.parentElement.classList.contains('folder')) {
                    const folder = e.target.parentElement;
                    const ul = folder.querySelector('ul');
                    
                    if (folder.classList.contains('collapsed')) {
                        folder.classList.remove('collapsed');
                        folder.classList.add('expanded');
                        ul.style.display = 'block';
                    } else {
                        folder.classList.remove('expanded');
                        folder.classList.add('collapsed');
                        ul.style.display = 'none';
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error fetching tree data:', error);
            // Fallback to static data if API request fails
            const treeData = {
                "Architecture": ["Infra layer", "Management layer", "Data layer", "Process layer"],
                "Resources/Assets": ["Hardware", "Software", "Misc"],
                "Infra": ["Servers", "VMs", "Services", "Environments"],
                "Manage": ["Projects", "Groups"],
                "Processes": {
                    "Workflow": ["install", "update", "uninstall"],
                    "Actions": ["start", "stop", "restart"]
                }
            };
            
            const treeContainer = document.getElementById('tree');
            createTreeNode(treeData, treeContainer);
            
            treeContainer.addEventListener('click', function(e) {
                if (e.target.tagName === 'SPAN' && e.target.parentElement.classList.contains('folder')) {
                    const folder = e.target.parentElement;
                    const ul = folder.querySelector('ul');
                    
                    if (folder.classList.contains('collapsed')) {
                        folder.classList.remove('collapsed');
                        folder.classList.add('expanded');
                        ul.style.display = 'block';
                    } else {
                        folder.classList.remove('expanded');
                        folder.classList.add('collapsed');
                        ul.style.display = 'none';
                    }
                }
            });
        });
});