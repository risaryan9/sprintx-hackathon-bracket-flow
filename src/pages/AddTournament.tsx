import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { createTournament } from "@/services/tournaments";
import { CreateTournamentInput } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const sportOptions = [
  "Football",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Cricket",
  "Badminton",
  "Table Tennis",
  "Chess",
  "Other",
];

const formatOptions = [
  { value: "knockouts", label: "Knockouts" },
  { value: "round_robin", label: "Round Robin" },
  { value: "double_elimination", label: "Double Elimination" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  sport: z.string().min(1, "Sport is required"),
  format: z.enum(["knockouts", "round_robin", "double_elimination"]),
  is_team_based: z.boolean(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  venue: z.string().min(1, "Venue is required"),
  city: z.string().min(1, "City is required"),
  organizer_contact: z.string().min(1, "Contact is required"),
  organizer_email: z.string().email("Invalid email address"),
  image_url: z.string().url("Invalid URL").min(1, "Image URL is required"),
  prize_pool: z.number().min(0, "Prize pool must be non-negative"),
  registration_fee: z.number().min(0, "Registration fee must be non-negative"),
  max_entries: z.number().min(1, "Max entries must be at least 1"),
  max_players_per_team: z.number().min(1, "Max players per team must be at least 1"),
  match_duration_minutes: z.number().min(1, "Match duration must be at least 1 minute"),
  rest_time_minutes: z.number().min(0, "Rest time must be non-negative"),
});

type FormValues = z.infer<typeof formSchema>;

const AddTournament = () => {
  const { organizerName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_team_based: false,
      prize_pool: 0,
      registration_fee: 0,
      max_entries: 32,
      max_players_per_team: 11,
      match_duration_minutes: 90,
      rest_time_minutes: 15,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTournamentInput) => createTournament(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-tournaments"] });
      toast({
        title: "Success",
        description: "Tournament created successfully!",
      });
      navigate("/host");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tournament",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!organizerName) {
      toast({
        title: "Error",
        description: "You must be logged in to create a tournament",
        variant: "destructive",
      });
      return;
    }

    const input: CreateTournamentInput = {
      ...values,
      organizer_name: organizerName,
      is_active: true,
    };

    mutation.mutate(input);
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="container px-4">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/host")}
              className="mb-6 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl">Create New Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tournament Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter tournament name"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Professional, Amateur"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sport *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-black/40 border-white/10">
                                  <SelectValue placeholder="Select sport" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0E0E0E] border-white/10">
                                {sportOptions.map((sport) => (
                                  <SelectItem key={sport} value={sport}>
                                    {sport}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="format"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Format *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-black/40 border-white/10">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0E0E0E] border-white/10">
                                {formatOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="venue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter venue name"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter city"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organizer_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organizer Email *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="organizer@example.com"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organizer_contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organizer Contact *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="+91 1234567890"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="https://example.com/image.jpg"
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prize_pool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prize Pool (₹) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registration_fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Fee (₹) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_entries"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Entries *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_players_per_team"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Players Per Team *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="match_duration_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Match Duration (minutes) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rest_time_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rest Time (minutes) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-black/40 border-white/10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_team_based"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-4 bg-black/30">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Team Based</FormLabel>
                            <FormDescription>
                              Enable if this tournament is for teams rather than individuals
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/host")}
                        className="flex-1 border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="button-gradient flex-1"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Tournament"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AddTournament;

