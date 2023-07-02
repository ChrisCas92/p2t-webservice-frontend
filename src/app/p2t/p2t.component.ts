import { Component, ElementRef, ViewChild } from '@angular/core';
import { p2tHttpService } from '../Services/p2tHttpService';
import { MatStepper } from '@angular/material/stepper';
import * as vis from 'vis';
import { HttpResponse } from '@angular/common/http';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  defer,
  first,
  fromEvent,
  merge,
  mergeMap,
  switchMap,
  takeUntil,
  tap,
  windowWhen,
} from 'rxjs';
import { SpinnerService } from '../Services/SpinnerService';
import { t2pHttpService } from '../Services/t2pHttpService';
import { ModelDisplayer } from '../utilities/modelDisplayer';

//global variable to store the file content
declare global {
  interface Window {
    fileContent: string;
    dropfileContent: string;
  }
}

@Component({
  selector: 'app-p2t',
  templateUrl: './p2t.component.html',
  styleUrls: ['./p2t.component.css'],
  template: `'
    <p>p2t works!</p>
    '`,
})
export class P2tComponent {
  response: any;
  test: String;
  fileType: String;

  // ViewChild decorator to get a reference to MatStepper
  @ViewChild('stepperRef') stepper!: MatStepper;

  // ViewChild decorator to get a reference to the drop zone element
  @ViewChild('dropZone', { static: true }) dropZone: ElementRef<HTMLDivElement>;

  isFileDropped: boolean = false;
  droppedFileName: string = '';

  // ViewChild decorator to get a reference to the HTML file input element
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

  // This method is called when a file is dragged on the drop zone
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  constructor(
    private p2tHttpService: p2tHttpService,
    private t2phttpService: t2pHttpService,
    public spinnerService: SpinnerService
  ) {}

  // This method generates the text based on the selected file type and content.Allows only pnml and bpmn files
  generateText() {
    console.log("Ich bin generate Text");

    const paragraph = document.createElement('p');
    if (this.fileType == 'bpmn'){
      console.log("Ich bin im fileType pnml und der Text ist: " + window.dropfileContent);
      ModelDisplayer.displayBPMNModel(window.dropfileContent);
    }
 
    else if (this.fileType == 'pnml'){
      console.log("Ich bin im fileType pnml und der Text ist: " + window.dropfileContent);
      //P2tComponent.displayPNMLModel(window.dropfileContent);
      this.t2phttpService.generatePetriNet(window.dropfileContent);
    }
 
    if (
      window.fileContent !== undefined ||
      window.dropfileContent !== undefined
    ) {
      this.spinnerService.show();
      //  this.p2tHttpService.postP2T(window.fileContent);
      this.p2tHttpService.postP2T(window.dropfileContent);
    } else {
      this.p2tHttpService.displayText('No files uploaded');
    }
    event.preventDefault();

    this.stepper.next();
  }

  // This method is called when files are dropped on the drop zone
  onDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const allowedExtensions = ['pnml', 'bpmn'];
      const hasAllowedFiles = Array.from(files).some((file) => {
        const fileExtension = file.name
          .substring(file.name.lastIndexOf('.') + 1)
          .toLowerCase();
        return allowedExtensions.includes(fileExtension);
      });
      if (hasAllowedFiles) {
        console.log('Hallo');

        this.processDroppedFiles(files);
        this.isFileDropped = true;
        this.droppedFileName = files.item(0)?.name || '';
      } else {
        alert('Please upload only files with .pnml or .bpmn format');
      }
    }
  }
  // Process the dropped files and read their contents
  processDroppedFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(file.name);
      const reader = new FileReader();

      reader.onload = (e) => {
        window.dropfileContent = reader.result as string;
      };
      reader.readAsText(file);
      console.log("Der Text ist: " + file );
      
    }
  }

  // Download the generated text as a txt file
  downloadText() {
    let text = this.p2tHttpService.getText();
    let filename = 'p2t';
    var element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    );
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
    document.body.removeChild(element);
  }

  // Trigger the file input to select files
  selectFiles() {
    this.fileInputRef.nativeElement.click();
  }

  // Handle the file selection event
  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const files = fileInput.files;
    if (files && files.length > 0) {
      this.processDroppedFiles(files);
      this.isFileDropped = true;
      this.droppedFileName = files[0].name;

      const allowedExtensions = ['pnml', 'bpmn'];
      const hasAllowedFiles = Array.from(files).some((file) => {
        const fileExtension = file.name
          .substring(file.name.lastIndexOf('.') + 1)
          .toLowerCase();
        if (fileExtension == 'pnml') this.fileType = 'pnml';
        else if (fileExtension == 'bpmn') this.fileType = 'bpmn';
        return allowedExtensions.includes(fileExtension);
      });
      if (hasAllowedFiles) {
        this.processDroppedFiles(files);
        this.isFileDropped = true;
        this.droppedFileName = files.item(0)?.name || '';
      } else {
        alert('Please upload only files with .pnml or .bpmn format');
      }
    }
  }
  public static displayPNMLModel(petrinet: any) {
    var generateWorkFlowNet = false; //Determines wether WoPeD specific Elements like XOR Split are created
    let prettyPetriNet = getPetriNet(petrinet);
    generatePetrinetConfig(prettyPetriNet);
    function generatePetrinetConfig(petrinet) {
      var data = getVisElements(petrinet);

      // create a network
      var container = document.getElementById('model-container');

      var options = {
        layout: {
          randomSeed: undefined,
          improvedLayout: true,
          hierarchical: {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 100,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true,
            direction: 'LR', // UD, DU, LR, RL
            sortMethod: 'directed', // hubsize, directed
          },
        },
        groups: {
          places: {
            color: { background: '#4DB6AC', border: '#00695C' },
            borderWidth: 3,
            shape: 'circle',
          },
          transitions: {
            color: { background: '#FFB74D', border: '#FB8C00' },
            shape: 'square',
            borderWidth: 3,
          },
          andJoin: {
            color: { background: '#DCE775', border: '#9E9D24' },
            shape: 'square',
            borderWidth: 3,
          },
          andSplit: {
            color: { background: '#DCE775', border: '#9E9D24' },
            shape: 'square',
            borderWidth: 3,
          },
          xorSplit: {
            color: { background: '#9575CD', border: '#512DA8' },
            shape: 'square',
            borderWidth: 3,
            image: '/img/and_split.svg',
          },
          xorJoin: {
            color: { background: '#9575CD', border: '#512DA8' },
            shape: 'square',
            borderWidth: 3,
          },
        },
        interaction: {
          zoomView: true,
          dragView: true,
        },
      };
      // initialize your network!
      var network = new vis.Network(container, data, options);
    }
    var gateways = [];
    function getPetriNet(PNML) {
      var places = PNML.getElementsByTagName('place');
      var transitions = PNML.getElementsByTagName('transition');
      var arcs = PNML.getElementsByTagName('arc');

      var petrinet = {
        places: [],
        transitions: [],
        arcs: [],
      };

      for (var x = 0; x < arcs.length; x++) {
        var arc = arcs[x];
        petrinet.arcs.push({
          id: arc.getAttribute('id'),
          source: arc.getAttribute('source'),
          target: arc.getAttribute('target'),
        });
      }

      for (var x = 0; x < places.length; x++) {
        var place = places[x];
        petrinet.places.push({
          id: place.getAttribute('id'),
          label: place.getElementsByTagName('text')[0].textContent,
        });
      }

      for (var x = 0; x < transitions.length; x++) {
        var transition = transitions[x];
        var isGateway = transition.getElementsByTagName('operator').length > 0;
        var gatewayType = undefined;
        var gatewayID = undefined;
        if (isGateway) {
          gatewayType = transition
            .getElementsByTagName('operator')[0]
            .getAttribute('type');
          gatewayID = transition
            .getElementsByTagName('operator')[0]
            .getAttribute('id');
        }
        petrinet.transitions.push({
          id: transition.getAttribute('id'),
          label: transition.getElementsByTagName('text')[0].textContent,
          isGateway: isGateway,
          gatewayType: gatewayType,
          gatewayID: gatewayID,
        });
      }
      return petrinet;
    }

    function resetGatewayLog() {
      gateways = [];
    }

    function logContainsGateway(transition) {
      for (var x = 0; x < gateways.length; x++) {
        if (gateways[x].gatewayID === transition.gatewayID) return true;
      }
      return false;
    }
    // Identifies the Gateways
    function logGatewayTransition(transition) {
      if (logContainsGateway(transition) === true) {
        for (var x = 0; x < gateways.length; x++) {
          if (gateways[x].gatewayID === transition.gatewayID)
            gateways[x].transitionIDs.push({ transitionID: transition.id });
        }
      } else {
        gateways.push({
          gatewayID: transition.gatewayID,
          transitionIDs: [{ transitionID: transition.id }],
        });
      }
    }
    
    function getGatewayIDsforReplacement(arc) {
      var replacement = { source: null, target: null };
      for (var x = 0; x < gateways.length; x++) {
        for (var i = 0; i < gateways[x].transitionIDs.length; i++) {
          if (arc.source === gateways[x].transitionIDs[i].transitionID) {
            replacement.source = gateways[x].gatewayID;
          }
          if (arc.target === gateways[x].transitionIDs[i].transitionID) {
            replacement.target = gateways[x].gatewayID;
          }
        }
      }
      return replacement;
    }

    function replaceGatewayArcs(arcs) {
      for (var x = 0; x < arcs.length; x++) {
        var replacement = getGatewayIDsforReplacement(arcs[x]);
        if (replacement.source !== null) {
          arcs[x].source = replacement.source;
        }
        if (replacement.target !== null) {
          arcs[x].target = replacement.target;
        }
      }
    }

    function getVisElements(PetriNet) {
      // provide the data in the vis format
      var edges = new vis.DataSet([]);
      var nodes = new vis.DataSet([]);
      for (var x = 0; x < PetriNet.places.length; x++) {
        nodes.add({
          id: PetriNet.places[x].id,
          group: 'places',
          label: PetriNet.places[x].label,
        });
      }

      for (var x = 0; x < PetriNet.transitions.length; x++) {
        if (
          !PetriNet.transitions[x].isGateway ||
          generateWorkFlowNet === false
        ) {
          nodes.add({
            id: PetriNet.transitions[x].id,
            group: 'transitions',
            label: PetriNet.transitions[x].id,
            title: PetriNet.transitions[x].label,
          });
        } else {
          var gatewayGroup = '';
          var label = '';
          switch (PetriNet.transitions[x].gatewayType) {
            case '101':
              gatewayGroup = 'andSplit';
              break;
            case '102':
              gatewayGroup = 'andJoin';
              break;
            case '104':
              gatewayGroup = 'xorSplit';
              break;
            case '105':
              gatewayGroup = 'xorJoin';
              break;
          }
          if (!logContainsGateway(PetriNet.transitions[x])) {
            nodes.add({
              id: PetriNet.transitions[x].gatewayID,
              group: gatewayGroup,
              label: label,
              title: PetriNet.transitions[x].label,
            });
          }
          logGatewayTransition(PetriNet.transitions[x]);
        }
      }

      if (generateWorkFlowNet === true) {
        replaceGatewayArcs(PetriNet.arcs);
      }

      for (var x = 0; x < PetriNet.arcs.length; x++) {
        edges.add({
          from: PetriNet.arcs[x].source,
          to: PetriNet.arcs[x].target,
          arrows: 'to',
        });
      }
      resetGatewayLog();
      return { nodes: nodes, edges: edges };
    }
  }
}
