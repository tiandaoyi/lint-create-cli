#!/usr/bin/env node
"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require("fs");

var cp = require("child_process");

var fsExtra = require("fs-extra");

var detectIndent = require("detect-indent");

var _ = require("lodash");

var p = require("path");

var program = require("commander");

var inquirer = require("inquirer");

var packageJsonPath = p.resolve(process.cwd(), "package.json");

var ora = require("ora");

var spinner = ora(); // const git = (args) => cp.spawnSync("git", args, { stdio: "inherit" });
// console.log("当前工作目录: ", process.cwd());
// console.log("当前模块文件目录: ", __dirname);
// cp.spawnSync('git', ['config','core.hooksPath','.husky'], { stdio: 'inherit',cwd:p.resolve(__dirname,"../") })

program.version(require("../package.json").version);
program.command("init").description("create lint").action(function (name) {// console.log(name);
});
program.parse(process.argv);
var question = [// {
//   type: "confirm",
//   name: "eslint",
//   message: "是否需要eslint",
//   default: true,
// },
{
  type: "confirm",
  name: "commit",
  message: "是否需要检测commit信息",
  "default": true
}, {
  type: "list",
  name: "install",
  message: "安装方式",
  choices: [{
    name: "npm",
    checked: true // 默认选中

  }, {
    name: "yarn"
  }, {
    name: "cnpm"
  }]
}];

var install = function install(res) {
  var eslint = res.eslint,
      commit = res.commit,
      install = res.install;
  var packages = {
    eslint: ["eslint", "eslint-plugin-vue"],
    standard: ["eslint-config-standard", "eslint-plugin-promise", "eslint-plugin-import", "eslint-plugin-node", "prettier", "eslint-config-prettier", "lint-staged", "husky"],
    commit: ["@commitlint/config-conventional", "@commitlint/cli", "commitizen"]
  };
  var arr = [].concat(_toConsumableArray(packages.eslint), _toConsumableArray(packages.standard), _toConsumableArray(commit ? packages.commit : []));
  var cp1 = cp.spawn(install, [install === "yarn" ? "add" : "install"].concat(_toConsumableArray(arr), [install === "yarn" ? "-D" : "--save-dev"]), {
    shell: true
  });
  spinner.start();
  cp1.stdout.on("data", function (buf) {
    console.log(buf.toString());
  });
  cp1.on("close", function (code) {
    // console.log("子进程已退出，退出码 " + code);
    spinner.stop();
    addEslint();
    addEditorConfig();
    addLintStaged();
    editGitHookPath();
    addPreCommitHook();

    if (commit) {
      addCommitMsgHook();
    }
  });
};

inquirer.prompt(question).then(function (res) {
  // console.log(res);
  install(res);
});

var addEslint = function addEslint() {
  var eslintPath = p.resolve(process.cwd(), ".eslintrc.js");
  fs.stat(eslintPath, function (error, stats) {
    if (error) {
      fsExtra.copy(p.resolve(__dirname, "../.eslintrc.js"), process.cwd() + "/.eslintrc.js", function (error) {
        if (error) return console.error(error);
      });
    } else {
      var eslintContent = require(eslintPath);

      var newExtends = eslintContent["extends"];
      ["standard", "prettier"].forEach(function (item) {
        if (newExtends.indexOf(item) <= -1) {
          newExtends.push(item);
        }
      });

      var newEslintContentContent = _.merge(eslintContent, {
        "extends": newExtends
      });

      var indent = detectIndent(JSON.stringify(newEslintContentContent)).indent || "  ";
      var str = "module.exports = " + JSON.stringify(newEslintContentContent, null, indent);
      fs.writeFileSync(eslintPath, str + "\n");
    }
  });
};

var addEditorConfig = function addEditorConfig() {
  fsExtra.copy(p.resolve(__dirname, "../.editorconfig"), process.cwd() + "/.editorconfig", function (error) {
    if (error) return console.error(error);
  });
};

var editGitHookPath = function editGitHookPath() {
  cp.spawn("git", ["config", "core.hooksPath", ".husky"], {// stdio: "inherit",
  });
};

var addFile = function addFile() {
  var dir = ".husky";
  fsExtra.copy(p.resolve(__dirname, "../.husky"), process.cwd() + "/.husky", function (error) {
    if (error) return console.error(error);
  });
};

var addPreCommitHook = function addPreCommitHook() {
  fsExtra.copy(p.resolve(__dirname, "../.husky/_"), process.cwd() + "/.husky/_", function (error) {
    if (error) return console.error(error);
  });
  fsExtra.copy(p.resolve(__dirname, "../.husky/pre-commit"), process.cwd() + "/.husky/pre-commit", function (error) {
    if (error) return console.error(error);
  });
};

var addCommitMsgHook = function addCommitMsgHook() {
  fsExtra.copy(p.resolve(__dirname, "../commitlint.config.js"), process.cwd() + "/commitlint.config.js", function (error) {
    if (error) return console.error(error);
  });
  var adapterNpmName = "cz-conventional-changelog";
  var commitizenAdapterConfig = {
    config: {
      commitizen: {
        path: "./node_modules/".concat(adapterNpmName)
      }
    }
  };
  var packageJsonString = fs.readFileSync(packageJsonPath, "utf-8");
  var indent = detectIndent(packageJsonString).indent || "  ";
  var packageJsonContent = JSON.parse(packageJsonString);
  var newPackageJsonContent = "";

  if (_.get(packageJsonContent, "config.commitizen.path") !== adapterNpmName) {
    // 插入commitizen配置
    newPackageJsonContent = _.merge(packageJsonContent, commitizenAdapterConfig);
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJsonContent, null, indent) + "\n");
  fsExtra.copy(p.resolve(__dirname, "../.husky/commit-msg"), process.cwd() + "/.husky/commit-msg", function (error) {
    if (error) return console.error(error);
  });
};

var addLintStaged = function addLintStaged() {
  var lintStaged = {
    "lint-staged": {
      "src/**/*.{js,vue,ts}": ["prettier --write", "eslint --fix"]
    }
  }; // package.json

  var packageJsonString = fs.readFileSync(packageJsonPath, "utf-8");
  var indent = detectIndent(packageJsonString).indent || "  ";
  var packageJsonContent = JSON.parse(packageJsonString);

  var newPackageJsonContent = _.merge(packageJsonContent, lintStaged);

  fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJsonContent, null, indent) + "\n");
};