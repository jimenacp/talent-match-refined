import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Save,
  X,
  Sliders,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import CandidateCard from '@/components/CandidateCard';
import CandidateProfileModal from '@/components/CandidateProfileModal';
import MatchDetailsModal from '@/components/MatchDetailsModal';
import { realCandidates } from '@/data/realCandidates';
import { toast } from '@/components/ui/use-toast';
import { Candidate, SkillFilter } from '@/types/candidate';
import FilterPanel from '@/components/FilterPanel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Add this to make TypeScript recognize the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface SkillFilters {
  leadership: number;
  communication: number;
  teamwork: number;
  problemSolving: number;
  criticalThinking: number;
}

const ResultsPage = () => {
  // const location = useLocation();
  // const realCandidates = location.state?.candidates as Candidate[];
  // console.log('realCandidates:', realCandidates);
  const [originalCandidates] = useState<Candidate[]>(realCandidates);
  const [candidates, setCandidates] = useState<Candidate[]>(realCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SkillFilters>({
    leadership: 1,
    communication: 1,
    teamwork: 1,
    problemSolving: 1,
    criticalThinking: 1
  });
  const navigate = useNavigate();
  
  const handleSaveSearch = () => {
    // Get current search parameters (in a real app, these would come from the search form)
    const searchData = {
      id: `search-${Date.now()}`,
      vacancy: "Dependiente/a",
      location: "Madrid",
      skills: [
        { name: "Comunicación", level: activeFilters.communication },
        { name: "Trabajo en equipo", level: activeFilters.teamwork },
        { name: "Liderazgo", level: activeFilters.leadership },
        { name: "Resolución de problemas", level: activeFilters.problemSolving },
        { name: "Pensamiento crítico", level: activeFilters.criticalThinking }
      ],
      date: new Date().toLocaleDateString(),
      candidateIds: candidates.map(c => c.id)
    };
    
    // Save to localStorage
    const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    savedSearches.push(searchData);
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    
    toast({
      title: "Búsqueda guardada",
      description: "La búsqueda ha sido guardada correctamente.",
    });
  };
  
  const handleExportResults = () => {
    try {
      const doc = new jsPDF();
  
      // Título
      doc.setFontSize(18);
      doc.text("📋 Resultados de búsqueda – Talent Match", 14, 20);
  
      // Fecha
      doc.setFontSize(10);
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 28);
  
      // Tabla
      const tableColumn = [
        "ID",
        "Nombre",
        "Puesto",
        "Ubicación",
        "Match",
        "Antigüedad",
        "Idiomas",
        "Movilidad"
      ];
  
      const tableRows = candidates.map((c) => [
        c.id,
        c.name,
        c.position,
        c.location,
        `${c.matchPercentage}%`,
        c.tenure,
        Array.isArray(c.languages) ? c.languages.join(", ") : c.languages,
        c.mobility ?? "Desconocido"
      ]);
  
      // Tabla principal
      // @ts-ignore
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        }
      });
  
      // Añadir filtros al final del PDF
      // @ts-ignore
      const finalY = doc.lastAutoTable?.finalY || 90;
      doc.setFontSize(11);
      doc.text("🎯 Filtros activos:", 14, finalY + 10);
      doc.setFontSize(10);
      doc.text(`• Liderazgo: ${activeFilters.leadership}`, 14, finalY + 16);
      doc.text(`• Comunicación: ${activeFilters.communication}`, 14, finalY + 21);
      doc.text(`• Trabajo en equipo: ${activeFilters.teamwork}`, 14, finalY + 26);
      doc.text(`• Resolución de problemas: ${activeFilters.problemSolving}`, 14, finalY + 31);
      doc.text(`• Pensamiento crítico: ${activeFilters.criticalThinking}`, 14, finalY + 36);
  
      // Guardar
      const filename = `resultados_match_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
      doc.save(filename);
  
      toast({
        title: "📄 PDF exportado",
        description: "La búsqueda ha sido exportada correctamente.",
      });
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el PDF correctamente.",
        variant: "destructive"
      });
    }
  };  

  const handleNewSearch = () => {
    navigate('/');
  };
  
  const applyFilters = (filters: SkillFilters) => {
    console.log("Aplicando filtros:", filters);
    
    // Save the active filters
    setActiveFilters(filters);
    
    // Calculate new match percentages based on weights
    const filteredCandidates = originalCandidates.map(candidate => {
      // Map candidate skills to our filter categories
      const skillMap = new Map();
      candidate.skills.forEach(skill => {
        const name = skill.name.toLowerCase();
        if (name.includes('liderazgo')) skillMap.set('leadership', skill.level);
        if (name.includes('comunicación')) skillMap.set('communication', skill.level);
        if (name.includes('equipo')) skillMap.set('teamwork', skill.level);
        if (name.includes('problema')) skillMap.set('problemSolving', skill.level);
        if (name.includes('crítico')) skillMap.set('criticalThinking', skill.level);
      });
      
      // Calculate weighted match percentage
      let totalPoints = 0;
      let weights = 0;

      Object.entries(filters).forEach(([key, weight]) => {
        const candidateLevel = skillMap.get(key) || 0;
        if (candidateLevel > 0) {
          totalPoints += weight;
        }
        weights += weight;
      });
      const newMatchPercentage = Math.round((candidate.basePercentage  + ((totalPoints/weights * 100))));

      // Return updated candidate with new match percentage
      return {
        ...candidate,
        matchPercentage: newMatchPercentage
      };
    });
    
    // Sort by match percentage
    filteredCandidates.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    // Update state with new candidates list
    setCandidates(filteredCandidates);
    
    // Close the filter panel
    setIsFilterOpen(false);
    
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-light">Candidatos ({candidates.length})</h1>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={handleSaveSearch}
            className="flex items-center text-sm border border-zara-gray-300 hover:bg-zara-gray-100"
          >
            <Save size={16} className="mr-2" />
            GUARDAR
          </Button>
          
          {false && (
            <Button 
              variant="outline" 
              onClick={handleExportResults}
              className="flex items-center text-sm border border-zara-gray-300 hover:bg-zara-gray-100"
            >
              <FileText size={16} className="mr-2" />
              EXPORTAR PDF
            </Button>
          )}

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline"
                className="flex items-center text-sm border border-zara-gray-300 hover:bg-zara-gray-100"
              >
                <Sliders size={16} className="mr-2" />
                FILTROS
              </Button>
            </SheetTrigger>
            <SheetContent>
              <FilterPanel onApplyFilters={applyFilters} initialFilters={activeFilters} />
            </SheetContent>
          </Sheet>
          
          <Button 
            variant="outline" 
            onClick={handleNewSearch}
            className="flex items-center text-sm border border-zara-gray-300 hover:bg-zara-gray-100"
          >
            <X size={16} className="mr-2" />
            NUEVA BÚSQUEDA
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {candidates.map((candidate) => (
          <CandidateCard 
            key={candidate.id}
            candidate={candidate}
            onViewProfile={() => setSelectedCandidate(candidate.id)}
            onViewMatch={() => setShowMatchDetails(candidate.id)}
          />
        ))}
      </div>
      
      {/* Modal para ver el perfil completo */}
      {selectedCandidate && (
        <CandidateProfileModal 
          candidateId={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
      
      {/* Modal para ver detalles del match */}
      {showMatchDetails && (
        <MatchDetailsModal 
          candidateId={showMatchDetails}
          isOpen={!!showMatchDetails}
          onClose={() => setShowMatchDetails(null)}
        />
      )}
    </div>
  );
};

export default ResultsPage;
