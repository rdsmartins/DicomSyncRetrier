const axios = require("axios");
const https = require("https");
const _ = require("lodash");
const DonwLoader = require("./Downloader");
const HttpUploader = require("./Uploader");

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});
const log = console.log;

const UNIDADES = [
  {
    label: "COPA",
    url: "https://10.36.143.195:8243"
  },
  {
    label: "Niteroi",
    url: "https://10.36.143.196:8243"
  }
];

const CENTRAL = { label: "Servidor Central", url: "https://10.250.5.223:8243" };

function getStudies(host) {
  return instance.get(`${host}/studies`);
}

function getInstanceById(host, instanceId) {
  return instance.get(`${host}/instances/${instanceId}`);
}

function getSerieById(host, serieId) {
  return instance.get(`${host}/series/${serieId}`);
}

function getInstances(host) {
  return instance.get(`${host}/instances`);
}

function getSeries(host) {
  return instance.get(`${host}/series`);
}

async function getCount(funcao, host) {
  const ret = await funcao(host);
  const numRet = ret.data.length;
  return numRet;
}

async function verificar(label, fn) {
  console.log("Verificando", label);
  let somaCombinada = 0;
  for (const unidade of UNIDADES) {
    const numEstudos = await getCount(fn, unidade.url);
    log(numEstudos, label, " no ", unidade.label);
    somaCombinada += numEstudos;
  }

  const numEstudosCentral = await getCount(fn, CENTRAL.url);

  log(numEstudosCentral, label, "no", CENTRAL.label);

  log("Combinado", UNIDADES.map(u => u.label).join(" e "), somaCombinada);

  if (somaCombinada === numEstudosCentral) {
    log("Central SINCRONIZADO a nivel de", label);
  } else {
    log("NAO SYNC'd");
  }
}

(async () => {
  await verificar("estudos", getStudies);
  await verificar("instancias", getInstances);
  await verificar("series", getSeries);

  const instancesCopa = await getInstances(UNIDADES[0].url);
  const instancesNit = await getInstances(UNIDADES[1].url);

  const instancesCentral = await getInstances(CENTRAL.url);

  const combinedUnidades = [].concat(instancesCopa.data, instancesNit.data);

  const delta = _.difference(combinedUnidades, instancesCentral.data);

  const missingFilesToProcess = [];

  for (const deltalInstanceId of delta) {
    let unidade = "";
    if (instancesCopa.data.indexOf(deltalInstanceId) > -1) {
      unidade = "COPA";
    } else if (instancesNit.data.indexOf(deltalInstanceId) > -1) {
      unidade = "Niteroi";
    } else {
      unidade = "NA";
    }

    const instanceDetail = await getInstanceById(
      UNIDADES.find(u => u.label === unidade).url,
      deltalInstanceId
    );
    const serieDetail = await getSerieById(
      UNIDADES.find(u => u.label === unidade).url,
      instanceDetail.data.ParentSeries
    );

    const fileDown = await DonwLoader(
      UNIDADES.find(u => u.label === unidade).url,
      deltalInstanceId,
      "/tmp"
    );

    missingFilesToProcess.push(fileDown.filePath);
    
    log(
      unidade,
      "- Instance ->",
      deltalInstanceId,
      "Series ->",
      instanceDetail.data.ParentSeries,
      "Study ->",
      serieDetail.data.ParentStudy
    );
  } // end loop

  console.log(missingFilesToProcess);
  
  for (const filePath of missingFilesToProcess) {

    const ret = await HttpUploader.uploadFile(CENTRAL.url + "/instances", filePath);

    console.log(ret);

  }
  // log(delta);
})();
