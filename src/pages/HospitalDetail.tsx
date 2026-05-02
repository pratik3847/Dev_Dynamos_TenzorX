import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHospital, HospitalResult } from "@/lib/api";
import { Loader2, ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Shield, Star, Users, Bed, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HospitalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [hospital, setHospital] = useState<HospitalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getHospital(token, id);
        if (isMounted) setHospital(data);
      } catch (err) {
        if (isMounted) setError("Failed to load hospital details. It may no longer be available.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchDetails();
    return () => { isMounted = false; };
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero bg-mesh flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Hospital Details...</h2>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-gradient-hero bg-mesh p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Navigator
        </Button>
        <Card className="p-8 text-center max-w-lg mx-auto mt-20 border-destructive/20 bg-destructive/5 rounded-3xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">Hospital Not Found</h3>
          <p className="text-muted-foreground mt-2 mb-6">{error || "The requested hospital could not be found."}</p>
          <Button onClick={() => navigate("/")} className="w-full">Return Home</Button>
        </Card>
      </div>
    );
  }

  const facilitiesList = hospital.facilities ? hospital.facilities.split(',').map(f => f.trim()).filter(Boolean) : [];
  const specialtiesList = hospital.specialties ? hospital.specialties.split(',').map(f => f.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Navigator
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24 max-w-5xl animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          <div className="h-24 w-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Building2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                {hospital.tier?.replace('_', ' ')} Tier
              </Badge>
              {hospital.nabh_accredited && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Shield className="h-3 w-3 mr-1" /> NABH Accredited
                </Badge>
              )}
              {hospital.hospital_category && (
                <Badge variant="outline" className="bg-card text-muted-foreground border-border">
                  {hospital.hospital_category}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{hospital.hospital_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              <span>{hospital.address || `${hospital.district || hospital.town}, ${hospital.state}`}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 border border-border/60 shadow-sm rounded-3xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" /> Key Statistics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 text-center border border-border/40">
                  <Bed className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{hospital.total_beds || "N/A"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Beds</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 text-center border border-border/40">
                  <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{hospital.num_doctors || "N/A"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Specialists</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 text-center border border-border/40">
                  <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-bold mt-1 text-balance">
                    {hospital.accreditation || (hospital.nabh_accredited ? "NABH" : "Standard")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Quality</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 text-center border border-border/40">
                  <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-bold mt-1 text-balance capitalize">{hospital.care_type || "General"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Care Type</p>
                </div>
              </div>
            </Card>

            {specialtiesList.length > 0 && (
              <Card className="p-6 border border-border/60 shadow-sm rounded-3xl">
                <h3 className="text-xl font-bold mb-4">Medical Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {specialtiesList.map((spec, i) => (
                    <Badge key={i} variant="outline" className="px-3 py-1 bg-background text-foreground/80">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {facilitiesList.length > 0 && (
              <Card className="p-6 border border-border/60 shadow-sm rounded-3xl">
                <h3 className="text-xl font-bold mb-4">Facilities Available</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {facilitiesList.map((fac, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {fac}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 border-2 border-primary/20 bg-gradient-soft shadow-card rounded-3xl">
              <h3 className="text-lg font-bold mb-4">Contact Information</h3>
              <div className="space-y-4">
                {hospital.telephone && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reception</p>
                      {hospital.telephone.split(',').map((tel, i) => (
                        <a key={i} href={`tel:${tel.trim()}`} className="block text-sm font-medium hover:text-primary transition-colors">
                          {tel.trim()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {hospital.emergency_num && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-destructive/80 font-semibold uppercase">Emergency</p>
                      <a href={`tel:${hospital.emergency_num}`} className="text-sm font-bold text-destructive hover:underline">
                        {hospital.emergency_num}
                      </a>
                    </div>
                  </div>
                )}

                {hospital.email_primary && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${hospital.email_primary}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                        {hospital.email_primary}
                      </a>
                    </div>
                  </div>
                )}

                {hospital.website && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a href={hospital.website.startsWith('http') ? hospital.website : `https://${hospital.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
                        Visit website
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full mt-6 rounded-xl font-bold" asChild>
                <a href={`https://maps.google.com/?q=${hospital.lat},${hospital.lng}`} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 mr-2" /> Get Directions
                </a>
              </Button>
            </Card>

            <Card className="p-6 border border-border/60 shadow-sm rounded-3xl bg-muted/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Location</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium text-foreground">District:</span> {hospital.district || "N/A"}</p>
                <p><span className="font-medium text-foreground">Town:</span> {hospital.town || "N/A"}</p>
                <p><span className="font-medium text-foreground">State:</span> {hospital.state || "N/A"}</p>
                <p><span className="font-medium text-foreground">Pincode:</span> {hospital.pincode || "N/A"}</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HospitalDetail;
