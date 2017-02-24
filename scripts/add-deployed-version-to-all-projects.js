/* @flow */
'use strict'

/*
usage: node scripts/add-deployed-version-to-all-projects.js
*/

// Node.js built-ins

const url = require('url')

// foreign modules

const inquirer = require('inquirer')
const JIRA = require('jira-client')
const pEachSeries = require('p-each-series')

// this module

let jira

function createClient ({ jiraUrl, username, password }) /* : Object */ {
  const parsed = url.parse(jiraUrl)
  return new JIRA({
    protocol: 'https',
    host: parsed.host,
    username,
    password,
    strictSSL: true
  })
}

function isDeployedVersion (version /* : Object */) /* : boolean */ {
  return version.name === 'Deployed' && version.released === true
}

function isSoftwareProject (project /* : Object */) /* : boolean */ {
  return project.projectTypeKey === 'software'
}

function ensureDeployedVersion (project /* : Object */) /* : Promise<any> */ {
  console.log(`checking ${project.name} ...`)
  return jira.getVersions(project.id)
    .then((versions) => {
      const deployed = versions.filter(isDeployedVersion)
      if (deployed.length) {
        console.log('found Deployed:', deployed[0])
        return Promise.resolve()
      }
      return jira.createVersion({
        name: 'Deployed',
        archived: false,
        released: true,
        projectId: project.id
      })
        .then((result) => {
          console.log('created Deployed:', result)
        })
    })
}

inquirer.prompt([
  {
    type: 'input',
    name: 'jiraUrl',
    message: 'JIRA URL',
    validate: (value) => {
      try {
        const parsed = url.parse(value)
        return !!(parsed.protocol === 'https:' && parsed.host)
      } catch (err) {
        return false
      }
    }
  },
  {
    type: 'input',
    name: 'username',
    message: 'username',
    validate: (value) => !!value
  },
  {
    type: 'input',
    name: 'password',
    message: 'password',
    validate: (value) => !!value
  }
])
  .then(createClient)
  .then((client) => { jira = client })
  .then(() => jira.listProjects())
  .then((projects) => projects.filter(isSoftwareProject))
  .then((projects) => pEachSeries(projects, ensureDeployedVersion))
  .catch((err) => {
    throw err
  })
