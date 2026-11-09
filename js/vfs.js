/**
 * Virtual File System (VFS) for OS-Quest Linux Terminal
 * Implements in-memory unix-like hierarchical file system
 */

class VFSNode {
  constructor(name, type = 'file', content = '', parent = null) {
    this.name = name;
    this.type = type; // 'file' or 'dir'
    this.content = content;
    this.parent = parent;
    this.children = type === 'dir' ? {} : null;
    this.createdAt = new Date();
    this.modifiedAt = new Date();
    this.permissions = type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
    this.owner = 'praktikan';
    this.group = 'praktikan';
  }
}

class VirtualFileSystem {
  constructor() {
    this.root = new VFSNode('', 'dir');
    this.currentPath = '/home/praktikan';
    this.initDefaultStructure();
  }

  initDefaultStructure() {
    this.root = new VFSNode('', 'dir');
    
    // Create /home/praktikan
    this.mkdir('/bin', true);
    this.mkdir('/etc', true);
    this.mkdir('/var/log', true);
    this.mkdir('/var/www/html', true);
    this.mkdir('/home/praktikan', true);
    this.mkdir('/tmp', true);

    // Create default index.html for Apache2 in /var/www/html
    this.createFile('/var/www/html/index.html', `<!DOCTYPE html>
<html>
<head><title>Apache2 Ubuntu Default Page</title></head>
<body>
  <h1>It works!</h1>
  <p>This is the default welcome page used to test the correct operation of the Apache2 server on Ubuntu systems.</p>
</body>
</html>`);

    // Reset current working directory
    this.currentPath = '/home/praktikan';
  }

  // Resolve arbitrary path string to absolute normalized path
  resolvePath(pathStr) {
    if (!pathStr || pathStr.trim() === '') {
      return this.currentPath;
    }

    pathStr = pathStr.trim();

    // Handle home tilde replacement
    if (pathStr === '~') {
      return '/home/praktikan';
    }
    if (pathStr.startsWith('~/')) {
      pathStr = '/home/praktikan' + pathStr.slice(1);
    }

    let isAbsolute = pathStr.startsWith('/');
    let parts = pathStr.split('/').filter(p => p.length > 0);

    let stack = isAbsolute ? [] : this.currentPath.split('/').filter(p => p.length > 0);

    for (let part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        if (stack.length > 0) {
          stack.pop();
        }
      } else {
        stack.push(part);
      }
    }

    return '/' + stack.join('/');
  }

  // Retrieve VFSNode at path or null
  getNode(pathStr) {
    let absPath = this.resolvePath(pathStr);
    if (absPath === '/') {
      return this.root;
    }

    let parts = absPath.split('/').filter(p => p.length > 0);
    let curr = this.root;

    for (let part of parts) {
      if (!curr || curr.type !== 'dir' || !curr.children[part]) {
        return null;
      }
      curr = curr.children[part];
    }

    return curr;
  }

  // Check if path is directory
  isDir(pathStr) {
    let node = this.getNode(pathStr);
    return node !== null && node.type === 'dir';
  }

  // Check if path is file
  isFile(pathStr) {
    let node = this.getNode(pathStr);
    return node !== null && node.type === 'file';
  }

  // Create directory
  mkdir(pathStr, recursive = false) {
    let absPath = this.resolvePath(pathStr);
    let parts = absPath.split('/').filter(p => p.length > 0);
    let curr = this.root;

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      let isLast = i === parts.length - 1;

      if (!curr.children[part]) {
        if (!recursive && !isLast) {
          throw new Error(`cannot create directory '${pathStr}': No such file or directory`);
        }
        let newDir = new VFSNode(part, 'dir', '', curr);
        curr.children[part] = newDir;
        curr = newDir;
      } else {
        if (curr.children[part].type !== 'dir') {
          throw new Error(`cannot create directory '${pathStr}': Not a directory`);
        }
        if (isLast && !recursive) {
          throw new Error(`cannot create directory ‘${part}’: File exists`);
        }
        curr = curr.children[part];
      }
    }

    return true;
  }

  // Change working directory
  cd(pathStr) {
    let target = this.resolvePath(pathStr);
    let node = this.getNode(target);

    if (!node) {
      throw new Error(`bash: cd: ${pathStr}: No such file or directory`);
    }

    if (node.type !== 'dir') {
      throw new Error(`bash: cd: ${pathStr}: Not a directory`);
    }

    this.currentPath = target;
    return this.currentPath;
  }

  // Create or overwrite file
  createFile(pathStr, content = '', overwrite = true) {
    let absPath = this.resolvePath(pathStr);
    let lastSlash = absPath.lastIndexOf('/');
    let parentPath = absPath.slice(0, lastSlash) || '/';
    let fileName = absPath.slice(lastSlash + 1);

    if (!fileName) {
      throw new Error(`Invalid file name`);
    }

    let parentNode = this.getNode(parentPath);
    if (!parentNode || parentNode.type !== 'dir') {
      throw new Error(`No such file or directory: '${parentPath}'`);
    }

    let existing = parentNode.children[fileName];
    if (existing) {
      if (existing.type === 'dir') {
        throw new Error(`'${fileName}' is a directory`);
      }
      if (!overwrite) {
        return existing;
      }
      existing.content = content;
      existing.modifiedAt = new Date();
      return existing;
    }

    let newFile = new VFSNode(fileName, 'file', content, parentNode);
    parentNode.children[fileName] = newFile;
    return newFile;
  }

  // Append content to file (operator >>)
  appendFile(pathStr, content) {
    let node = this.getNode(pathStr);
    if (!node) {
      return this.createFile(pathStr, content);
    }
    if (node.type === 'dir') {
      throw new Error(`'${node.name}' is a directory`);
    }

    if (node.content && !node.content.endsWith('\n') && content.length > 0) {
      node.content += '\n' + content;
    } else {
      node.content += content;
    }
    node.modifiedAt = new Date();
    return node;
  }

  // Read file content
  readFile(pathStr) {
    let node = this.getNode(pathStr);
    if (!node) {
      throw new Error(`cat: ${pathStr}: No such file or directory`);
    }
    if (node.type === 'dir') {
      throw new Error(`cat: ${pathStr}: Is a directory`);
    }
    return node.content;
  }

  // List directory entries
  listDir(pathStr = '.') {
    let node = this.getNode(pathStr);
    if (!node) {
      throw new Error(`ls: cannot access '${pathStr}': No such file or directory`);
    }
    if (node.type !== 'dir') {
      return [node];
    }
    return Object.values(node.children);
  }

  // Remove file or directory
  rm(pathStr, recursive = false) {
    let absPath = this.resolvePath(pathStr);
    if (absPath === '/' || absPath === '/home/praktikan') {
      throw new Error(`rm: cannot remove protected directory '${pathStr}'`);
    }

    let node = this.getNode(absPath);
    if (!node) {
      throw new Error(`rm: cannot remove '${pathStr}': No such file or directory`);
    }

    if (node.type === 'dir' && !recursive) {
      throw new Error(`rm: cannot remove '${pathStr}': Is a directory`);
    }

    let parent = node.parent;
    if (parent && parent.children[node.name]) {
      delete parent.children[node.name];
      return true;
    }
    return false;
  }

  // Convert current path to display format (~ for /home/praktikan)
  getDisplayPath() {
    if (this.currentPath === '/home/praktikan') {
      return '~';
    }
    if (this.currentPath.startsWith('/home/praktikan/')) {
      return '~' + this.currentPath.slice('/home/praktikan'.length);
    }
    return this.currentPath;
  }

  // Tree representation starting from /home/praktikan
  getHomeTreeData() {
    let homeNode = this.getNode('/home/praktikan');
    if (!homeNode) return [];

    const buildTree = (node, fullPath) => {
      let result = {
        name: node.name,
        path: fullPath,
        type: node.type,
        size: node.type === 'file' ? (node.content ? node.content.length : 0) : 0,
        children: []
      };

      if (node.type === 'dir') {
        let keys = Object.keys(node.children).sort();
        for (let key of keys) {
          let childPath = fullPath === '/' ? `/${key}` : `${fullPath}/${key}`;
          result.children.push(buildTree(node.children[key], childPath));
        }
      }
      return result;
    };

    return buildTree(homeNode, '/home/praktikan');
  }

  // Count files matching criteria (helpful for level validator)
  findFiles(basePath, filterFn) {
    let results = [];
    let startNode = this.getNode(basePath);
    if (!startNode) return results;

    const traverse = (node, curPath) => {
      if (node.type === 'file') {
        if (!filterFn || filterFn(node, curPath)) {
          results.push({ node, path: curPath });
        }
      } else if (node.type === 'dir') {
        for (let key in node.children) {
          traverse(node.children[key], `${curPath}/${key}`);
        }
      }
    };

    traverse(startNode, this.resolvePath(basePath));
    return results;
  }

  // Count/find directories matching criteria
  findDirs(basePath, filterFn) {
    let results = [];
    let startNode = this.getNode(basePath);
    if (!startNode) return results;

    const traverse = (node, curPath) => {
      if (node.type === 'dir') {
        if (!filterFn || filterFn(node, curPath)) {
          results.push({ node, path: curPath });
        }
        for (let key in node.children) {
          traverse(node.children[key], `${curPath}/${key}`);
        }
      }
    };

    traverse(startNode, this.resolvePath(basePath));
    return results;
  }
}

// Export singleton instance
window.vfs = new VirtualFileSystem();
